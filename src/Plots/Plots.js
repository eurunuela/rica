import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import ToggleSwitch from "./ToggleSwitch";
import ResetAndSave from "./ResetAndSave";
import ScatterPlot from "./ScatterPlot";
import PieChart from "./PieChart";
import TimeSeries from "./TimeSeries";
import FFTSpectrum from "./FFTSpectrum";
import BrainViewer from "./BrainViewer";
import ComponentTable from "./ComponentTable";
import CorrelationHeatmap from "./CorrelationHeatmap";
import { assignColor, formatComponentName } from "./PlotUtils";

// Chart dimensions - sized to fit 2x2 in half screen width
// Reduced for better screen fit (was 420x380)
const CHART_WIDTH = 360;
const CHART_HEIGHT = 320;

// Theme-aware colors
const getColors = (isDark) => ({
  // Light mode: softer pastel colors
  // Dark mode: more saturated colors that pop on dark backgrounds
  accepted: isDark ? "#4ade80" : "#86EFAC",
  acceptedHover: isDark ? "#22c55e" : "#22C55E",
  rejected: isDark ? "#f87171" : "#FCA5A5",
  rejectedHover: isDark ? "#ef4444" : "#EF4444",
  ignored: isDark ? "#38bdf8" : "#7DD3FC",
  ignoredHover: isDark ? "#0ea5e9" : "#0EA5E9",
});


function Plots({ componentData, componentFigures, originalData, mixingMatrix, niftiBuffer, maskBuffer, crossComponentMetrics, externalRegressorsFigure, isDark = false }) {
  const [processedData, setProcessedData] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedClassification, setSelectedClassification] = useState("accepted");
  const [clickedElement, setClickedElement] = useState("");
  const [colormapSaturation, setColormapSaturation] = useState(0.25); // Default 25%
  const [useStaticView, setUseStaticView] = useState(false); // Toggle for static PNG vs interactive Niivue
  const [isTableCollapsed, setIsTableCollapsed] = useState(false); // Toggle for component table visibility

  // Check if we have the new interactive visualization data
  const hasInteractiveViews = mixingMatrix?.data && niftiBuffer;

  // Extract elbow thresholds from cross-component metrics (if available)
  const kappaElbow = crossComponentMetrics?.kappa_allcomps_elbow;
  const rhoElbow = crossComponentMetrics?.rho_allcomps_elbow;

  // Compute connecting line data for rank plots (sorted by rank)
  const kappaRankLine = useMemo(() => {
    if (!processedData.length) return [];
    // Sort by kappa rank and create line data
    const sorted = [...processedData].sort((a, b) => a.kappaRank - b.kappaRank);
    return sorted.map((d) => ({ x: d.kappaRank, y: d.kappa }));
  }, [processedData]);

  const rhoRankLine = useMemo(() => {
    if (!processedData.length) return [];
    // Sort by rho rank and create line data
    const sorted = [...processedData].sort((a, b) => a.rhoRank - b.rhoRank);
    return sorted.map((d) => ({ x: d.rhoRank, y: d.rho }));
  }, [processedData]);

  // Get current component's time series from mixing matrix
  const currentTimeSeries = useMemo(() => {
    if (!mixingMatrix?.data || selectedIndex < 0 || selectedIndex >= mixingMatrix.data.length) {
      return [];
    }
    return mixingMatrix.data[selectedIndex] || [];
  }, [mixingMatrix, selectedIndex]);

  // Get current component label (formatted for display)
  const currentComponentLabel = useMemo(() => {
    const label = processedData[selectedIndex]?.label || "";
    return formatComponentName(label);
  }, [processedData, selectedIndex]);

  // Extract external regressor correlation columns from componentData
  const externalRegressorColumns = useMemo(() => {
    if (!componentData?.[0]?.length) return [];
    const firstComponent = componentData[0][0];
    if (!firstComponent) return [];
    // Find all columns that contain "external regressor correlation"
    return Object.keys(firstComponent).filter(key =>
      key.toLowerCase().includes('external regressor correlation')
    );
  }, [componentData]);

  // Check if we have external regressor correlation data
  const hasExternalRegressorData = externalRegressorColumns.length > 0;

  // Initialize data from props
  const initializeData = useCallback(() => {
    if (!componentData?.[0]?.length) return;

    const compData = JSON.parse(JSON.stringify(componentData[0]));
    assignColor(compData);

    // Create unified data structure
    const processed = compData.map((d, i) => ({
      label: d.Component,
      kappa: d.kappa,
      rho: d.rho,
      kappaRank: d["kappa rank"],
      rhoRank: d["rho rank"],
      variance: d["variance explained"],
      classification: d.classification,
      originalIndex: i,
    }));

    setProcessedData(processed);

    // Set initial image
    if (componentFigures?.length && processed.length) {
      findComponentImage(0, processed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentData, componentFigures]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Find and display component image
  const findComponentImage = useCallback(
    (index, data) => {
      if (!componentFigures?.length || !data?.[index]) return;

      const label = data[index].label;
      const match = label.match(/\d+/g);
      if (!match) return;

      let compNum = match.join("");
      if (compNum.length === 2) compNum = "0" + compNum;
      const compName = `comp_${compNum}.png`;

      const figure = componentFigures.find((f) => f.name.includes(compName));
      if (figure) {
        setClickedElement(figure.img);
      }
    },
    [componentFigures]
  );

  // Handle classification change
  const handleNewSelection = useCallback(
    (val) => {
      setProcessedData((prev) => {
        const updated = [...prev];
        if (updated[selectedIndex]) {
          updated[selectedIndex] = {
            ...updated[selectedIndex],
            classification: val,
          };
        }
        return updated;
      });
      setSelectedClassification(val);
    },
    [selectedIndex]
  );

  // Handle point/slice click
  const handlePointClick = useCallback(
    (index) => {
      setSelectedIndex(index);
      setSelectedClassification(processedData[index]?.classification || "accepted");
      findComponentImage(index, processedData);
    },
    [processedData, findComponentImage]
  );

  // Prepare pie chart data (sorted by classification, then variance descending)
  // Defined here so keyboard navigation can use it
  const pieData = useMemo(() => {
    if (!processedData.length) return [];

    // Classification order: accepted first, then rejected
    const classificationOrder = { accepted: 0, rejected: 1 };

    // Create a mapping to track original indices
    const withOriginalIndex = processedData.map((d, i) => ({ ...d, originalIdx: i }));

    // Sort for pie display: group by classification, then by variance (highest first)
    const sorted = [...withOriginalIndex].sort((a, b) => {
      const orderA = classificationOrder[a.classification] ?? 3;
      const orderB = classificationOrder[b.classification] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return b.variance - a.variance; // Highest variance first within each group
    });

    return sorted.map((d) => ({
      ...d,
      value: d.variance,
      pieIndex: d.originalIdx,
    }));
  }, [processedData]);

  // Find selected index in pie data
  const selectedPieIndex = useMemo(() => {
    return pieData.findIndex((d) => d.originalIdx === selectedIndex);
  }, [pieData, selectedIndex]);

  // Keyboard shortcuts
  useHotkeys("a", () => handleNewSelection("accepted"), [handleNewSelection]);
  useHotkeys("r", () => handleNewSelection("rejected"), [handleNewSelection]);

  useHotkeys(
    "left",
    () => {
      // Navigate using pie chart order (wraps around)
      if (pieData.length === 0) return;
      const currentPieIdx = pieData.findIndex((d) => d.originalIdx === selectedIndex);
      const newPieIdx = currentPieIdx <= 0 ? pieData.length - 1 : currentPieIdx - 1;
      const newOriginalIdx = pieData[newPieIdx].originalIdx;
      setSelectedIndex(newOriginalIdx);
      setSelectedClassification(processedData[newOriginalIdx]?.classification || "accepted");
      findComponentImage(newOriginalIdx, processedData);
    },
    [selectedIndex, pieData, processedData, findComponentImage]
  );

  useHotkeys(
    "right",
    () => {
      // Navigate using pie chart order (wraps around)
      if (pieData.length === 0) return;
      const currentPieIdx = pieData.findIndex((d) => d.originalIdx === selectedIndex);
      const newPieIdx = currentPieIdx >= pieData.length - 1 ? 0 : currentPieIdx + 1;
      const newOriginalIdx = pieData[newPieIdx].originalIdx;
      setSelectedIndex(newOriginalIdx);
      setSelectedClassification(processedData[newOriginalIdx]?.classification || "accepted");
      findComponentImage(newOriginalIdx, processedData);
    },
    [selectedIndex, pieData, processedData, findComponentImage]
  );

  // Save handler
  const saveManualClassification = useCallback(() => {
    if (!originalData?.[0]) return;

    const origData = JSON.parse(JSON.stringify(originalData[0]));

    origData.forEach((row, i) => {
      delete row.color;
      delete row.colorHover;

      const processed = processedData.find((p) => p.label === row.Component);
      if (processed) {
        row.original_classification = row.classification;
        row.classification = processed.classification;

        if (row.classification !== row.original_classification) {
          row.classification_tags =
            (row.classification_tags || "") + ", Manual reclassify with Rica";
          if (row.rationale !== undefined) {
            row.rationale = "I001";
          }
        }
      }
    });

    // Generate TSV
    const headings = Object.keys(origData[0]).join("\t");
    const rows = origData.map((row) => Object.values(row).join("\t")).join("\n");
    const tsv = [headings, rows].join("\n");

    // Extract accepted/rejected indices
    const accepted = [];
    const rejected = [];

    origData.forEach((row, i) => {
      const isManual =
        row.classification_tags?.includes("Manual reclassify with Rica") ||
        row.rationale === "I001";

      if (row.classification === "accepted" && isManual) {
        accepted.push(i);
      }
      if (row.classification === "rejected" && isManual) {
        rejected.push(i);
      }
    });

    // Download files
    const downloadFile = (content, filename, type = "text/plain") => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    downloadFile(accepted.join(","), "accepted.txt");
    downloadFile(rejected.join(","), "rejected.txt");
    downloadFile(tsv, "manual_classification.tsv", "text/tab-separated-values");
  }, [originalData, processedData]);

  // Handle pie slice click - map back to original index
  const handlePieClick = useCallback(
    (pieIdx) => {
      const originalIdx = pieData[pieIdx]?.originalIdx;
      if (originalIdx !== undefined) {
        handlePointClick(originalIdx);
      }
    },
    [pieData, handlePointClick]
  );

  if (!processedData.length) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '256px',
        color: 'var(--text-tertiary)',
      }}>
        <p>Loading chart data...</p>
      </div>
    );
  }

  return (
    <div tabIndex={0} className="outline-none focus:outline-none focus:ring-0 w-full" style={{ outline: "none", boxShadow: "none" }}>
      {/* Top controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        marginTop: '24px',
      }}>
        <ToggleSwitch
          values={["accepted", "rejected"]}
          selected={selectedClassification}
          colors={[getColors(isDark).accepted, getColors(isDark).rejected]}
          handleNewSelection={handleNewSelection}
          isDark={isDark}
        />
        <ResetAndSave
          handleReset={initializeData}
          handleSave={saveManualClassification}
          isDark={isDark}
        />
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '8px',
        fontSize: '13px',
        color: 'var(--text-tertiary)',
      }}>
        Click to select. Scroll to zoom. Double-click to zoom in. Use A/R keys to classify.
      </div>

      {/* Main content: plots on left, brain image on right */}
      <div className="flex flex-row w-full px-4 py-4 gap-4 mt-2">
        {/* Left side: 4 interactive plots in 2x2 grid - 50% width */}
        <div className="w-1/2 flex justify-center">
          <div className="grid grid-cols-2 gap-2">
                {/* Kappa vs Rho scatter plot */}
                <ScatterPlot
                  data={processedData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  title="Kappa vs Rho"
                  xLabel="Kappa"
                  yLabel="Rho"
                  selectedIndex={selectedIndex}
                  onPointClick={handlePointClick}
                  getX={(d) => d.kappa}
                  getY={(d) => d.rho}
                  isDark={isDark}
                  vLine={kappaElbow}
                  hLine={rhoElbow}
                  showDiagonal={true}
                />

                {/* Variance Pie Chart */}
                <PieChart
                  data={pieData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  title="Variance Explained"
                  selectedIndex={selectedPieIndex}
                  onSliceClick={handlePieClick}
                  isDark={isDark}
                />

                {/* Rho vs Rank scatter plot */}
                <ScatterPlot
                  data={processedData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  title="Rho Rank"
                  xLabel="Rank"
                  yLabel="Rho"
                  selectedIndex={selectedIndex}
                  onPointClick={handlePointClick}
                  getX={(d) => d.rhoRank}
                  getY={(d) => d.rho}
                  isDark={isDark}
                  hLine={rhoElbow}
                  connectingLine={rhoRankLine}
                />

                {/* Kappa vs Rank scatter plot */}
                <ScatterPlot
                  data={processedData}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  title="Kappa Rank"
                  xLabel="Rank"
                  yLabel="Kappa"
                  selectedIndex={selectedIndex}
                  onPointClick={handlePointClick}
                  getX={(d) => d.kappaRank}
                  getY={(d) => d.kappa}
                  isDark={isDark}
                  hLine={kappaElbow}
                  connectingLine={kappaRankLine}
                />
              </div>
            </div>

        {/* Right side: Component visualization - 50% width to match left */}
        <div
          style={{
            width: '50%',
            maxWidth: '800px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {/* View toggle - matches ToggleSwitch styling pattern */}
          {hasInteractiveViews && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}>
              <span id="view-toggle-label" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>View:</span>
              <div
                role="radiogroup"
                aria-labelledby="view-toggle-label"
                style={{
                  position: 'relative',
                  height: '32px',
                  fontWeight: 600,
                  backgroundColor: isDark ? '#27272a' : '#e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                }}
              >
                {['Interactive', 'Static'].map((val) => (
                  <span
                    key={val}
                    role="radio"
                    aria-checked={(val === 'Static') === useStaticView}
                    aria-label={`Switch to ${val.toLowerCase()} view`}
                    tabIndex={0}
                    onClick={() => setUseStaticView(val === 'Static')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setUseStaticView(val === 'Static');
                      }
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 10,
                      height: '32px',
                      width: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'color 0.2s ease',
                      color: (val === 'Static') === useStaticView ? '#1f2937' : (isDark ? '#a1a1aa' : 'rgba(0,0,0,0.6)'),
                      fontSize: '12px',
                    }}
                  >
                    {val}
                  </span>
                ))}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: useStaticView ? '80px' : '0px',
                    zIndex: 0,
                    display: 'block',
                    height: '32px',
                    width: '80px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    background: isDark ? '#3b82f6' : '#60a5fa',
                  }}
                />
              </div>
            </div>
          )}

          {hasInteractiveViews && !useStaticView ? (
            <>
              {/* Time series on top */}
              <div style={{ width: '100%' }}>
                <TimeSeries
                  data={currentTimeSeries}
                  width={750}
                  height={150}
                  title="Time Series"
                  componentLabel={currentComponentLabel}
                  lineColor={selectedClassification === 'accepted' ? getColors(isDark).acceptedHover : getColors(isDark).rejectedHover}
                  isDark={isDark}
                />
              </div>

              {/* Brain stat map viewer in middle */}
              <div style={{ width: '100%' }}>
                <BrainViewer
                  niftiBuffer={niftiBuffer}
                  maskBuffer={maskBuffer}
                  componentIndex={selectedIndex}
                  width={750}
                  height={280}
                  componentLabel={currentComponentLabel}
                  saturation={colormapSaturation}
                  isDark={isDark}
                />
              </div>

              {/* Saturation slider */}
              <div style={{
                width: '100%',
                maxWidth: '750px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '4px 0',
              }}>
                <label htmlFor="saturation-slider" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Saturation:</label>
                <input
                  id="saturation-slider"
                  type="range"
                  min="1"
                  max="100"
                  value={colormapSaturation * 100}
                  onChange={(e) => setColormapSaturation(parseFloat(e.target.value) / 100)}
                  aria-label="Adjust brain map colormap saturation"
                  aria-valuemin={1}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(colormapSaturation * 100)}
                  className="focus:outline-none"
                  style={{
                    width: '300px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'right' }}>
                  {Math.round(colormapSaturation * 100)}%
                </span>
              </div>

              {/* FFT on bottom */}
              <div style={{ width: '100%' }}>
                <FFTSpectrum
                  timeSeries={currentTimeSeries}
                  width={750}
                  height={150}
                  title="Power Spectrum"
                  sampleRate={1}
                  lineColor={selectedClassification === 'accepted' ? getColors(isDark).acceptedHover : getColors(isDark).rejectedHover}
                  isDark={isDark}
                />
              </div>
            </>
          ) : (
            /* Static PNG display - either by choice or fallback */
            clickedElement && (
              <img
                className="max-w-full h-auto rounded-lg shadow-lg"
                alt="Component visualization"
                src={clickedElement}
                style={{ maxHeight: '600px' }}
              />
            )
          )}
        </div>
      </div>

      {/* Component table - full width below charts (collapsible) */}
      <ComponentTable
        data={componentData?.[0] || []}
        selectedIndex={selectedIndex}
        onRowClick={handlePointClick}
        classifications={processedData.map((d) => d.classification)}
        isDark={isDark}
        isCollapsed={isTableCollapsed}
        onToggleCollapse={() => setIsTableCollapsed(!isTableCollapsed)}
      />

      {/* External Regressors Correlation Heatmap (interactive) or static figure */}
      {(hasExternalRegressorData || externalRegressorsFigure) && (
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px',
          marginTop: '16px',
        }}>
          {hasExternalRegressorData ? (
            // Interactive heatmap when correlation data is available in metrics TSV
            <div style={{ width: '100%', maxWidth: '1400px' }}>
              <CorrelationHeatmap
                data={componentData[0]}
                regressorColumns={externalRegressorColumns}
                width={Math.min(1400, 200 + externalRegressorColumns.length * 80)}
                height={Math.min(800, 160 + processedData.length * 20)}
                selectedIndex={selectedIndex}
                onCellClick={handlePointClick}
                isDark={isDark}
              />
            </div>
          ) : (
            // Fallback to static SVG if no correlation data but figure exists
            <>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '16px',
              }}>
                External Regressor Correlations
              </h3>
              <img
                src={externalRegressorsFigure}
                alt="External Regressor Correlations"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Plots;
