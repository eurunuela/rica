import React, { useState, useCallback, useEffect, useRef } from "react";
import Papa from "papaparse";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { parseMixingMatrix } from "../utils/tsvParser";
import { LOGO_DATA_URL } from "../constants/logo";
import { VERSION_DISPLAY } from "../constants/version";

// Convert blob to data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Rank array helper
function rankArray(data) {
  const sorted = data.slice().sort((a, b) => b - a);
  return data.map((v) => sorted.indexOf(v) + 1);
}

// Add ranking columns to component data
function rankComponents(data) {
  const varNormalized = data.map((d) => d["normalized variance explained"]);
  const kappa = data.map((d) => d["kappa"]);
  const rho = data.map((d) => d["rho"]);

  const rankVariance = rankArray(varNormalized);
  const rankKappa = rankArray(kappa);
  const rankRho = rankArray(rho);

  data.forEach((d, i) => {
    d["variance explained rank"] = rankVariance[i];
    d["kappa rank"] = rankKappa[i];
    d["rho rank"] = rankRho[i];
  });
}

// Parse manual classification TSV file
function parseManualClassification(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimiter: "\t",
  });
  
  // Check for parsing errors
  if (parsed.errors && parsed.errors.length > 0) {
    console.warn("Errors parsing manual_classification.tsv:", parsed.errors);
  }
  
  return parsed.data;
}

// Apply manual classifications to component data
function applyManualClassifications(components, manualClassificationData) {
  if (!manualClassificationData || !components.length) {
    return;
  }

  // Create a Map for O(n) lookup performance
  // Filter out entries with invalid Component field
  const manualMap = new Map(
    manualClassificationData
      .filter((entry) => entry.Component != null)
      .map((entry) => [entry.Component, entry])
  );

  let appliedCount = 0;
  components.forEach((component) => {
    // Skip components with invalid Component field
    if (component.Component == null) {
      return;
    }

    const manualEntry = manualMap.get(component.Component);
    if (manualEntry) {
      component.classification = manualEntry.classification;
      if (manualEntry.original_classification) {
        component.original_classification = manualEntry.original_classification;
      }
      if (manualEntry.classification_tags) {
        component.classification_tags = manualEntry.classification_tags;
      }
      if (manualEntry.rationale) {
        component.rationale = manualEntry.rationale;
      }
      appliedCount++;
    }
  });

  console.log("[Rica] Applied manual classifications to", appliedCount, "components");
}

// Promise wrapper for FileReader
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function IntroPopup({ onDataLoad, onLoadingStart, closePopup, isLoading, isDark }) {
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const hasTriedServerLoad = useRef(false);

  // Load files from local server via HTTP
  const loadFromServer = useCallback(
    async (files, basePath) => {
      console.log("[Rica] Starting server load with", files.length, "files");
      onLoadingStart();

      // Filter to relevant files
      const relevantFiles = files.filter(
        (f) =>
          f.includes("comp_") ||
          f.includes(".svg") ||
          f === "report.txt" ||
          (f.includes("_metrics.tsv") && !f.toLowerCase().includes("pca")) ||
          (f.startsWith("tedana_20") && f.endsWith(".tsv")) ||
          (f.includes("_mixing.tsv") && !f.toLowerCase().includes("pca") && !f.toLowerCase().includes("orth")) ||
          (f.includes("_components.nii.gz") && f.toLowerCase().includes("ica") && !f.includes("stat-z")) ||
          f === "betas_OC.nii.gz" ||
          f.includes("_mask.nii") ||
          f.includes("CrossComponent_metrics.json") ||
          (f.includes("cross_component_metrics.json") && !f.toLowerCase().includes("pca")) ||
          f === "manual_classification.tsv" ||
          // QC NIfTI files
          f.includes("T2starmap.nii") ||
          f.includes("t2svG.nii") ||
          f.includes("S0map.nii") ||
          f === "s0vG.nii.gz" ||
          f.includes("rmse_statmap.nii") ||
          f === "rmse.nii.gz" ||
          // Decision tree files
          f.includes("decision_tree.json") ||
          f.includes("status_table.tsv") ||
          f.includes("registry.json")
      );

      setLoadingProgress({ current: 0, total: relevantFiles.length });

      const compFigures = [];
      const carpetFigures = [];
      const diagnosticFigures = [];
      let info = "";
      let components = [];
      let originalData = [];
      let dirPath = basePath || "";
      let mixingMatrix = null;
      let niftiBuffer = null;
      let maskBuffer = null;
      let crossComponentMetrics = null;
      // QC NIfTI buffers
      const qcNiftiBuffers = {};
      // External regressors correlation figure
      let externalRegressorsFigure = null;
      // Manual classification data
      let manualClassificationData = null;
      // Decision tree data
      let decisionTreeData = null;
      let statusTableData = null;
      // Repetition time from registry
      let repetitionTime = null;

      // Process files via HTTP fetch
      for (const filepath of relevantFiles) {
        const filename = filepath.split("/").pop();

        try {
          // Component figures (PNG)
          if (filename.includes("comp_") && filename.endsWith(".png")) {
            const response = await fetch(`/${filepath}`);
            const blob = await response.blob();
            const dataUrl = await blobToDataURL(blob);
            compFigures.push({ name: filename, img: dataUrl });
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // SVG figures (carpet plots vs diagnostic figures vs external regressors)
          if (filename.endsWith(".svg")) {
            const response = await fetch(`/${filepath}`);
            const blob = await response.blob();
            const dataUrl = await blobToDataURL(blob);
            // Separate carpet plots, external regressors, and diagnostic figures
            if (filename.includes("carpet_")) {
              carpetFigures.push({ name: filename, img: dataUrl });
            } else if (filename.includes("confound_correlations")) {
              externalRegressorsFigure = dataUrl;
            } else {
              diagnosticFigures.push({ name: filename, img: dataUrl });
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Report info
          if (filename === "report.txt") {
            const response = await fetch(`/${filepath}`);
            info = await response.text();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Component metrics table
          if (filename.includes("_metrics.tsv") && !filename.toLowerCase().includes("pca")) {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
            });
            originalData = JSON.parse(JSON.stringify(parsed.data));
            rankComponents(parsed.data);
            components = parsed.data;
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Dataset path
          if (filename.startsWith("tedana_20") && filename.endsWith(".tsv")) {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.includes("Using output directory:")) {
                const match = line.match(/Using output directory:\s*(.+)/);
                if (match) {
                  dirPath = match[1].trim();
                  break;
                }
              }
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // ICA Mixing matrix (exclude PCA and Orth variants)
          if (filename.includes("_mixing.tsv") && !filename.toLowerCase().includes("pca") && !filename.toLowerCase().includes("orth")) {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            mixingMatrix = parseMixingMatrix(text);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // ICA components NIfTI
          if ((filename.includes("_components.nii.gz") && filename.toLowerCase().includes("ica") && !filename.includes("stat-z")) || filename === "betas_OC.nii.gz") {
            const response = await fetch(`/${filepath}`);
            niftiBuffer = await response.arrayBuffer();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Brain mask NIfTI
          if (filename.includes("_mask.nii") && !maskBuffer) {
            const response = await fetch(`/${filepath}`);
            maskBuffer = await response.arrayBuffer();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Cross-component metrics (for elbow thresholds)
          if (filename.includes("CrossComponent_metrics.json") ||
              (filename.includes("cross_component_metrics.json") && !filename.toLowerCase().includes("pca"))) {
            const response = await fetch(`/${filepath}`);
            crossComponentMetrics = await response.json();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // QC NIfTI files (T2*, S0, RMSE)
          if (filename.includes("T2starmap.nii") || filename.includes("t2svG.nii")) {
            const response = await fetch(`/${filepath}`);
            qcNiftiBuffers.t2star = await response.arrayBuffer();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
          if ((filename.includes("S0map.nii") && !filename.includes("limited")) || filename === "s0vG.nii.gz") {
            const response = await fetch(`/${filepath}`);
            qcNiftiBuffers.s0 = await response.arrayBuffer();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
          if (filename.includes("rmse_statmap.nii") || filename === "rmse.nii.gz") {
            const response = await fetch(`/${filepath}`);
            qcNiftiBuffers.rmse = await response.arrayBuffer();
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Manual classification file
          if (filename === "manual_classification.tsv") {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            manualClassificationData = parseManualClassification(text);
            console.log("[Rica] Loaded manual_classification.tsv with", manualClassificationData?.length || 0, "entries");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Decision tree JSON
          if (filename.includes("decision_tree.json")) {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            decisionTreeData = JSON.parse(text);
            console.log("[Rica] Loaded decision tree with", decisionTreeData?.nodes?.length || 0, "nodes");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Status table TSV
          if (filename.includes("status_table.tsv")) {
            const response = await fetch(`/${filepath}`);
            const text = await response.text();
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: false, // Keep as strings for classification states
              delimiter: "\t",
            });
            statusTableData = parsed.data;
            console.log("[Rica] Loaded status table with", statusTableData?.length || 0, "components");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Registry JSON (for RepetitionTime)
          if (filename.includes("registry.json")) {
            const response = await fetch(`/${filepath}`);
            const registry = await response.json();
            if (registry?.RepetitionTime != null) {
              repetitionTime = registry.RepetitionTime;
              console.log("[Rica] Loaded RepetitionTime from registry:", repetitionTime);
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
        } catch (error) {
          console.error(`Error fetching file ${filepath}:`, error);
        }
      }

      // Sort component figures by name
      compFigures.sort((a, b) => a.name.localeCompare(b.name));
      carpetFigures.sort((a, b) => a.name.localeCompare(b.name));
      diagnosticFigures.sort((a, b) => a.name.localeCompare(b.name));

      // Apply manual classifications if available
      applyManualClassifications(components, manualClassificationData);

      // Pass all data to parent
      onDataLoad({
        componentFigures: compFigures,
        carpetFigures,
        diagnosticFigures,
        components: [components],
        info,
        originalData: [originalData],
        dirPath,
        mixingMatrix,
        niftiBuffer,
        maskBuffer,
        crossComponentMetrics,
        qcNiftiBuffers,
        externalRegressorsFigure,
        hasManualClassifications: manualClassificationData && manualClassificationData.length > 0,
        // Decision tree data
        decisionTreeData,
        statusTableData,
        repetitionTime,
      });
    },
    [onDataLoad, onLoadingStart]
  );

  // Check for local server on mount and auto-load if files found
  useEffect(() => {
    // Only try once and only on localhost
    if (hasTriedServerLoad.current) return;
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return;

    hasTriedServerLoad.current = true;
    console.log("[Rica] Checking for local server files...");

    // Try to fetch file list from server
    fetch("/api/files")
      .then((r) => r.json())
      .then((data) => {
        console.log("[Rica] Server response:", data.files?.length, "files found");
        if (data.files?.length > 0) {
          // Auto-load immediately
          loadFromServer(data.files, data.path);
        }
      })
      .catch((err) => {
        console.log("[Rica] No local server detected:", err.message);
        // Not running with Rica server, use manual folder selection
      });
  }, [loadFromServer]);

  const processFiles = useCallback(
    async (e) => {
      onLoadingStart();

      const files = Array.from(e.target.files);
      const totalFiles = files.filter(
        (f) =>
          f.name.includes("comp_") ||
          f.name.includes(".svg") ||
          f.name === "report.txt" ||
          (f.name.includes("_metrics.tsv") && !f.name.toLowerCase().includes("pca")) ||
          (f.name.startsWith("tedana_20") && f.name.endsWith(".tsv")) ||
          // New files for Niivue integration
          (f.name.includes("_mixing.tsv") && !f.name.toLowerCase().includes("pca") && !f.name.toLowerCase().includes("orth")) ||
          (f.name.includes("_components.nii.gz") && f.name.toLowerCase().includes("ica") && !f.name.includes("stat-z")) ||
          f.name === "betas_OC.nii.gz" ||
          f.name.includes("_mask.nii") ||
          f.name.includes("CrossComponent_metrics.json") ||
          (f.name.includes("cross_component_metrics.json") && !f.name.toLowerCase().includes("pca")) ||
          f.name === "manual_classification.tsv" ||
          // QC NIfTI files
          f.name.includes("T2starmap.nii") ||
          f.name.includes("t2svG.nii") ||
          f.name.includes("S0map.nii") ||
          f.name === "s0vG.nii.gz" ||
          f.name.includes("rmse_statmap.nii") ||
          f.name === "rmse.nii.gz" ||
          // Decision tree files
          f.name.includes("decision_tree.json") ||
          f.name.includes("status_table.tsv") ||
          f.name.includes("registry.json")
      ).length;

      setLoadingProgress({ current: 0, total: totalFiles });

      const compFigures = [];
      const carpetFigures = [];
      const diagnosticFigures = [];
      let info = "";
      let components = [];
      let originalData = [];
      let dirPath = "";
      let mixingMatrix = null;
      let niftiBuffer = null;
      let maskBuffer = null;
      let crossComponentMetrics = null;
      // QC NIfTI buffers
      const qcNiftiBuffers = {};
      // External regressors correlation figure
      let externalRegressorsFigure = null;
      // Manual classification data
      let manualClassificationData = null;
      // Decision tree data
      let decisionTreeData = null;
      let statusTableData = null;
      // Repetition time from registry
      let repetitionTime = null;

      // Process all files in parallel using Promise.all
      const filePromises = files.map(async (file) => {
        const filename = file.name;

        try {
          // Component figures (PNG)
          if (filename.includes("comp_") && filename.endsWith(".png")) {
            const dataUrl = await readFileAsDataURL(file);
            compFigures.push({ name: filename, img: dataUrl });
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // SVG figures (carpet plots vs diagnostic figures vs external regressors)
          if (filename.endsWith(".svg")) {
            const dataUrl = await readFileAsDataURL(file);
            // Separate carpet plots, external regressors, and diagnostic figures
            if (filename.includes("carpet_")) {
              carpetFigures.push({ name: filename, img: dataUrl });
            } else if (filename.includes("confound_correlations")) {
              externalRegressorsFigure = dataUrl;
            } else {
              diagnosticFigures.push({ name: filename, img: dataUrl });
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Report info
          if (filename === "report.txt") {
            info = await readFileAsText(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Component metrics table
          if (filename.includes("_metrics.tsv") && !filename.toLowerCase().includes("pca")) {
            const text = await readFileAsText(file);
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
            });
            originalData = JSON.parse(JSON.stringify(parsed.data));
            rankComponents(parsed.data);
            components = parsed.data;
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Dataset path
          if (filename.startsWith("tedana_20") && filename.endsWith(".tsv")) {
            const text = await readFileAsText(file);
            // Look for the line containing "Using output directory:"
            const lines = text.split("\n");
            for (const line of lines) {
              if (line.includes("Using output directory:")) {
                const match = line.match(/Using output directory:\s*(.+)/);
                if (match) {
                  dirPath = match[1].trim();
                  break;
                }
              }
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // ICA Mixing matrix (time series data for Niivue, exclude PCA and Orth variants)
          if (filename.includes("_mixing.tsv") && !filename.toLowerCase().includes("pca") && !filename.toLowerCase().includes("orth")) {
            const text = await readFileAsText(file);
            mixingMatrix = parseMixingMatrix(text);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // ICA components NIfTI (4D brain maps for Niivue)
          if ((filename.includes("_components.nii.gz") && filename.toLowerCase().includes("ica") && !filename.includes("stat-z")) || filename === "betas_OC.nii.gz") {
            niftiBuffer = await readFileAsArrayBuffer(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Brain mask NIfTI (for masking stat maps in Niivue)
          if (filename.includes("_mask.nii") && !maskBuffer) {
            maskBuffer = await readFileAsArrayBuffer(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Cross-component metrics (for elbow thresholds)
          if (filename.includes("CrossComponent_metrics.json") ||
              (filename.includes("cross_component_metrics.json") && !filename.toLowerCase().includes("pca"))) {
            const text = await readFileAsText(file);
            crossComponentMetrics = JSON.parse(text);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // QC NIfTI files (T2*, S0, RMSE)
          if (filename.includes("T2starmap.nii") || filename.includes("t2svG.nii")) {
            qcNiftiBuffers.t2star = await readFileAsArrayBuffer(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
          if ((filename.includes("S0map.nii") && !filename.includes("limited")) || filename === "s0vG.nii.gz") {
            qcNiftiBuffers.s0 = await readFileAsArrayBuffer(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
          if (filename.includes("rmse_statmap.nii") || filename === "rmse.nii.gz") {
            qcNiftiBuffers.rmse = await readFileAsArrayBuffer(file);
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Manual classification file
          if (filename === "manual_classification.tsv") {
            const text = await readFileAsText(file);
            manualClassificationData = parseManualClassification(text);
            console.log("[Rica] Loaded manual_classification.tsv with", manualClassificationData?.length || 0, "entries");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Decision tree JSON
          if (filename.includes("decision_tree.json")) {
            const text = await readFileAsText(file);
            decisionTreeData = JSON.parse(text);
            console.log("[Rica] Loaded decision tree with", decisionTreeData?.nodes?.length || 0, "nodes");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Status table TSV
          if (filename.includes("status_table.tsv")) {
            const text = await readFileAsText(file);
            const parsed = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: false, // Keep as strings for classification states
              delimiter: "\t",
            });
            statusTableData = parsed.data;
            console.log("[Rica] Loaded status table with", statusTableData?.length || 0, "components");
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }

          // Registry JSON (for RepetitionTime)
          if (filename.includes("registry.json")) {
            const text = await readFileAsText(file);
            const registry = JSON.parse(text);
            if (registry?.RepetitionTime != null) {
              repetitionTime = registry.RepetitionTime;
              console.log("[Rica] Loaded RepetitionTime from registry:", repetitionTime);
            }
            setLoadingProgress((prev) => ({ ...prev, current: prev.current + 1 }));
          }
        } catch (error) {
          console.error(`Error reading file ${filename}:`, error);
        }
      });

      // Wait for all files to be processed
      await Promise.all(filePromises);

      // Sort component figures by name for consistent ordering
      compFigures.sort((a, b) => a.name.localeCompare(b.name));
      carpetFigures.sort((a, b) => a.name.localeCompare(b.name));
      diagnosticFigures.sort((a, b) => a.name.localeCompare(b.name));

      // Apply manual classifications if available
      applyManualClassifications(components, manualClassificationData);

      // Pass all data to parent at once - no delays!
      onDataLoad({
        componentFigures: compFigures,
        carpetFigures,
        diagnosticFigures,
        components: [components],
        info,
        originalData: [originalData],
        dirPath,
        // New data for Niivue integration
        mixingMatrix,
        niftiBuffer,
        maskBuffer,
        crossComponentMetrics,
        qcNiftiBuffers,
        externalRegressorsFigure,
        hasManualClassifications: manualClassificationData && manualClassificationData.length > 0,
        // Decision tree data
        decisionTreeData,
        statusTableData,
        repetitionTime,
      });
    },
    [onDataLoad, onLoadingStart]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={closePopup}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          margin: '0 24px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '16px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closePopup}
          type="button"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M13.7 0.3c-0.4-0.4-1-0.4-1.4 0L7 5.6 1.7 0.3c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4L5.6 7l-5.3 5.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.4 0.3 0.7 0.3s0.5-0.1 0.7-0.3L7 8.4l5.3 5.3c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4L8.4 7l5.3-5.3c0.4-0.4 0.4-1 0-1.4z"/>
          </svg>
        </button>

        <div style={{ padding: '32px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              {/* Loading spinner */}
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 20px',
                border: '3px solid var(--border-default)',
                borderTopColor: 'var(--accent-accepted)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

              <p style={{
                fontSize: '15px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Processing files
              </p>

              {loadingProgress.total > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--border-default)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-accepted)',
                        borderRadius: '2px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    marginTop: '12px',
                    fontFamily: "monospace",
                  }}>
                    {loadingProgress.current} / {loadingProgress.total}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Logo */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <img
                  src={LOGO_DATA_URL}
                  alt="Rica"
                  style={{ width: '36px', height: '36px' }}
                />
                <div>
                  <h1 style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}>
                    Rica
                  </h1>
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    margin: 0,
                    marginTop: '2px',
                  }}>
                    {VERSION_DISPLAY}
                  </p>
                </div>
              </div>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '20px'
              }}>
                Load a <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>tedana</span> output folder to visualize and classify ICA components interactively.
              </p>

              <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: '1px solid var(--border-subtle)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  lineHeight: 1.5,
                  margin: 0
                }}>
                  Files are processed locally in your browser
                </p>
              </div>

              <label
                htmlFor="file-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isDark ? '#0a0a0b' : '#ffffff',
                  backgroundColor: isDark ? '#fafafa' : '#111827',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <FontAwesomeIcon icon={faFolder} />
                Select folder
                <input
                  id="file-upload"
                  type="file"
                  name="file"
                  directory=""
                  webkitdirectory=""
                  onChange={processFiles}
                  style={{ display: 'none' }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default IntroPopup;
