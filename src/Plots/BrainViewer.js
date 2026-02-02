import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Niivue } from "@niivue/niivue";

// Generate mosaic string with slices in mm coordinates
// Format: "A -40 -20 0 20 40 ; S -40 -20 0 20 40 ; C -40 -20 0 20 40"
// Each orientation gets its own row (separated by semicolons)
function generateMosaicString(numSlices, extents, offset = 0) {
  if (!extents) return "A 0 ; S 0 ; C 0";

  // Calculate slice positions for each orientation
  // offset shifts the center position (-0.5 to 0.5 range)
  const generateSlices = (min, max) => {
    const range = max - min;
    const margin = range * 0.1; // 10% margin from edges
    const center = (min + max) / 2 + offset * range * 0.5;
    const spread = range * 0.6; // Cover 60% of the volume
    const start = Math.max(min + margin, center - spread / 2);
    const end = Math.min(max - margin, center + spread / 2);

    const positions = [];
    for (let i = 0; i < numSlices; i++) {
      const pos = start + (i / (numSlices - 1)) * (end - start);
      positions.push(Math.round(pos));
    }
    return positions.join(" ");
  };

  const axialSlices = generateSlices(extents.axial[0], extents.axial[1]);
  const sagittalSlices = generateSlices(extents.sagittal[0], extents.sagittal[1]);
  const coronalSlices = generateSlices(extents.coronal[0], extents.coronal[1]);

  // Each orientation on its own row, separated by semicolons
  return `A ${axialSlices} ; S ${sagittalSlices} ; C ${coronalSlices}`;
}

function BrainViewer({ niftiBuffer, maskBuffer, componentIndex, width, height, componentLabel, isDark = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nvRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [sliceOffset, setSliceOffset] = useState(0); // Center offset (-0.5 to 0.5)
  const [saturation, setSaturation] = useState(0.25); // Colormap saturation (0.01 to 1.0)
  const [threshold, setThreshold] = useState(0); // Threshold 0-50% of max value
  const [colormapPositive, setColormapPositive] = useState("warm");
  const [colormapNegative, setColormapNegative] = useState("cool");
  const [volumeExtents, setVolumeExtents] = useState(null); // Store volume extents for mosaic
  const maxAbsRef = useRef(null); // Store max absolute value for saturation adjustments
  const numSlices = 7; // Fixed at 7 slices per row

  // Colormap options
  const POSITIVE_COLORMAPS = [
    { value: "warm", label: "Warm" },
    { value: "hot", label: "Hot" },
    { value: "red", label: "Red" },
    { value: "copper", label: "Copper" },
    { value: "gold", label: "Gold" },
  ];

  const NEGATIVE_COLORMAPS = [
    { value: "cool", label: "Cool" },
    { value: "winter", label: "Winter" },
    { value: "blue", label: "Blue" },
    { value: "violet", label: "Violet" },
  ];

  // Brain viewer always has black background
  const canvasBgColor = "#000000";

  // Theme colors for UI elements - title always light on black background
  const titleColor = "#fafafa";
  const loadingBg = "#000000";
  const loadingText = isDark ? '#a1a1aa' : '#6b7280';
  const errorBg = isDark ? '#451a1a' : '#fef2f2';
  const errorText = isDark ? '#fca5a5' : '#dc2626';
  const placeholderBg = isDark ? '#18181b' : '#f3f4f6';
  const placeholderText = isDark ? '#71717a' : '#9ca3af';
  const sliderBg = isDark ? "#18181b" : "#ffffff";
  const sliderText = isDark ? "#a1a1aa" : "#6b7280";

  // Niivue background color (RGBA 0-1) - always black for brain viewer
  const niivueBgColor = useMemo(() => [0, 0, 0, 1], []);

  // Initialize Niivue instance
  useEffect(() => {
    let mounted = true;
    let statBlobUrl = null;
    let maskBlobUrl = null;

    async function initNiivue() {
      if (!canvasRef.current || !niftiBuffer) return;

      try {
        // Create Niivue instance with mosaic-friendly options
        const nv = new Niivue({
          backColor: niivueBgColor,
          show3Dcrosshair: false,
          crosshairColor: [0.5, 0.5, 0.5, 0.5],
          multiplanarForceRender: false,
          showColorbar: false,
          tileMargin: 0,
          multiplanarPadPixels: 0,
        });

        // Attach to canvas
        await nv.attachToCanvas(canvasRef.current);

        // Build volumes array
        const volumes = [];

        // Load mask first as background if available
        if (maskBuffer) {
          const maskBlob = new Blob([maskBuffer], { type: "application/gzip" });
          maskBlobUrl = URL.createObjectURL(maskBlob);
          volumes.push({
            url: maskBlobUrl,
            name: "mask.nii.gz",
            colormap: "gray",
            opacity: 1.0,
            cal_min: 0,
            cal_max: 1,
          });
        }

        // Load stat map with warm/cool diverging colormap
        const statBlob = new Blob([niftiBuffer], { type: "application/gzip" });
        statBlobUrl = URL.createObjectURL(statBlob);

        const statVolume = {
          url: statBlobUrl,
          name: "components.nii.gz",
          colormap: colormapPositive,
          colormapNegative: colormapNegative,
          useQFormNotSForm: true,
          cal_min: 0.001,      // Small positive threshold to hide zero values
          cal_maxNeg: -0.001,  // Small negative threshold to hide zero values
        };

        volumes.push(statVolume);

        // Load volumes
        await nv.loadVolumes(volumes);

        // Set initial frame for the stat map (last volume loaded)
        const statVolIndex = maskBuffer ? 1 : 0;
        if (nv.volumes.length > statVolIndex && componentIndex >= 0) {
          nv.setFrame4D(nv.volumes[statVolIndex].id, componentIndex);
        }

        // Get volume extents for mosaic slice positions
        let extents = null;
        const statVolIdx = nv.volumes.length - 1;
        if (nv.volumes.length > 0) {
          const vol = nv.volumes[statVolIdx]; // Get stat map (last volume)
          const maxAbs = Math.max(Math.abs(vol.cal_min), Math.abs(vol.cal_max));
          maxAbsRef.current = maxAbs; // Store for saturation and threshold adjustments
          const range = maxAbs * saturation;
          // Always use a minimum threshold (0.1% of max) to make zero values transparent
          const minThresholdPercent = 0.1;
          const thresholdVal = maxAbs * Math.max(minThresholdPercent, threshold) / 100;

          // Positive values: threshold to max (warm colormap)
          vol.cal_min = thresholdVal;
          vol.cal_max = range;

          // Negative values: -max to -threshold (cool colormap)
          vol.cal_minNeg = -range;
          vol.cal_maxNeg = -thresholdVal;

          // Get extents in mm for each axis
          const min = vol.extentsMin || [-80, -120, -60];
          const max = vol.extentsMax || [80, 80, 90];

          extents = {
            // Sagittal (x-axis): left-right
            sagittal: [min[0], max[0]],
            // Coronal (y-axis): posterior-anterior
            coronal: [min[1], max[1]],
            // Axial (z-axis): inferior-superior
            axial: [min[2], max[2]],
          };
        }

        // Set mosaic view with multiple slices per orientation (3 rows)
        nv.opts.backColor = niivueBgColor;
        nv.opts.centerMosaic = true;
        const mosaicString = generateMosaicString(numSlices, extents, 0);
        nv.setSliceMosaicString(mosaicString);

        nv.updateGLVolume();
        nv.drawScene();

        if (mounted) {
          nvRef.current = nv;
          setVolumeExtents(extents);
          setIsLoaded(true);
          setError(null);
        }
      } catch (err) {
        console.error("Error initializing Niivue:", err);
        if (mounted) {
          setError(err.message || "Failed to load brain viewer");
        }
      }
    }

    initNiivue();

    return () => {
      mounted = false;
      // Cleanup Blob URLs
      if (statBlobUrl) {
        URL.revokeObjectURL(statBlobUrl);
      }
      if (maskBlobUrl) {
        URL.revokeObjectURL(maskBlobUrl);
      }
      // Cleanup Niivue instance
      if (nvRef.current) {
        nvRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niftiBuffer, maskBuffer]); // Reinit when buffer or mask changes

  // Update mosaic when slice offset changes
  useEffect(() => {
    if (nvRef.current && isLoaded && volumeExtents) {
      try {
        const nv = nvRef.current;
        const mosaicString = generateMosaicString(numSlices, volumeExtents, sliceOffset);
        nv.setSliceMosaicString(mosaicString);
        nv.drawScene();
      } catch (err) {
        console.error("Error updating mosaic:", err);
      }
    }
  }, [sliceOffset, numSlices, isLoaded, volumeExtents]);

  // Update background color when theme changes
  useEffect(() => {
    if (nvRef.current && isLoaded) {
      try {
        const nv = nvRef.current;
        nv.opts.backColor = niivueBgColor;
        nv.drawScene();
      } catch (err) {
        console.error("Error updating background:", err);
      }
    }
  }, [isDark, isLoaded, niivueBgColor]);

  // Update frame when componentIndex changes
  useEffect(() => {
    if (nvRef.current && isLoaded && componentIndex >= 0) {
      try {
        const nv = nvRef.current;
        // Stat map is the last volume (index 1 if mask loaded, 0 otherwise)
        const statVolIndex = nv.volumes.length - 1;
        if (nv.volumes && nv.volumes.length > 0) {
          nv.setFrame4D(nv.volumes[statVolIndex].id, componentIndex);
        }
      } catch (err) {
        console.error("Error setting frame:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentIndex, isLoaded]);

  // Update colormap range when saturation or threshold changes
  useEffect(() => {
    if (nvRef.current && isLoaded && maxAbsRef.current) {
      try {
        const nv = nvRef.current;
        const statVolIndex = nv.volumes.length - 1;
        if (nv.volumes && nv.volumes.length > 0) {
          const vol = nv.volumes[statVolIndex];
          const range = maxAbsRef.current * saturation;
          // Always use a minimum threshold (0.1% of max) to make zero values transparent
          const minThresholdPercent = 0.1;
          const thresholdVal = maxAbsRef.current * Math.max(minThresholdPercent, threshold) / 100;

          // Update colormap range with threshold
          vol.cal_min = thresholdVal;
          vol.cal_max = range;
          vol.cal_minNeg = -range;
          vol.cal_maxNeg = -thresholdVal;

          // Set background before redraw
          nv.opts.backColor = niivueBgColor;

          // Redraw the scene
          nv.updateGLVolume();
          nv.drawScene();
        }
      } catch (err) {
        console.error("Error updating saturation/threshold:", err);
      }
    }
  }, [saturation, threshold, isLoaded, niivueBgColor]);

  // Update colormaps when colormap selections change
  useEffect(() => {
    if (nvRef.current && isLoaded && maxAbsRef.current) {
      try {
        const nv = nvRef.current;
        const statVolIndex = nv.volumes.length - 1;
        if (nv.volumes && nv.volumes.length > 0) {
          const vol = nv.volumes[statVolIndex];
          vol.colormap = colormapPositive;
          vol.colormapNegative = colormapNegative;

          // Preserve saturation and threshold when changing colormap
          const range = maxAbsRef.current * saturation;
          const minThresholdPercent = 0.1;
          const thresholdVal = maxAbsRef.current * Math.max(minThresholdPercent, threshold) / 100;
          vol.cal_min = thresholdVal;
          vol.cal_max = range;
          vol.cal_minNeg = -range;
          vol.cal_maxNeg = -thresholdVal;

          // Redraw the scene
          nv.updateGLVolume();
          nv.drawScene();
        }
      } catch (err) {
        console.error("Error updating colormaps:", err);
      }
    }
  }, [colormapPositive, colormapNegative, isLoaded, saturation, threshold]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (nvRef.current && canvasRef.current) {
      nvRef.current.resizeListener();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Show placeholder if no data
  if (!niftiBuffer) {
    return (
      <div
        style={{
          width: width || "100%",
          height: height || 500,
          background: placeholderBg,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: placeholderText,
          fontSize: 14,
        }}
      >
        No brain map data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: width || "100%",
        height: height || 500,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: canvasBgColor,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          fontWeight: "bold",
          color: titleColor,
          padding: "4px 0 0 0",
        }}
      >
        Brain Stat Map {componentLabel && `- ${componentLabel}`}
      </div>

      {/* Loading state */}
      {!isLoaded && !error && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: loadingBg,
            color: loadingText,
            fontSize: 14,
          }}
        >
          Loading brain viewer...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: errorBg,
            color: errorText,
            fontSize: 14,
            padding: 20,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {/* Niivue canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          flex: 1,
          minHeight: "350px",
          display: "block",
          outline: "none",
          backgroundColor: canvasBgColor,
        }}
      />

      {/* Position slider - navigate through brain */}
      {isLoaded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "8px 16px",
            backgroundColor: sliderBg,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "70px",
            }}
          >
            Position
          </span>
          <input
            type="range"
            min="-0.4"
            max="0.4"
            step="0.02"
            value={sliceOffset}
            onChange={(e) => setSliceOffset(parseFloat(e.target.value))}
            style={{
              flex: 1,
              maxWidth: "200px",
              cursor: "pointer",
              accentColor: "#3b82f6",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "40px",
              textAlign: "center",
            }}
          >
            {sliceOffset > 0 ? "+" : ""}{Math.round(sliceOffset * 100)}%
          </span>
        </div>
      )}

      {/* Saturation slider */}
      {isLoaded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "8px 16px",
            backgroundColor: sliderBg,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "70px",
            }}
          >
            Saturation
          </span>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={saturation * 100}
            onChange={(e) => setSaturation(parseFloat(e.target.value) / 100)}
            style={{
              flex: 1,
              maxWidth: "200px",
              cursor: "pointer",
              accentColor: "#3b82f6",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "40px",
              textAlign: "center",
            }}
          >
            {Math.round(saturation * 100)}%
          </span>
        </div>
      )}

      {/* Threshold slider */}
      {isLoaded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "8px 16px",
            backgroundColor: sliderBg,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "70px",
            }}
          >
            Threshold
          </span>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{
              flex: 1,
              maxWidth: "200px",
              cursor: "pointer",
              accentColor: "#3b82f6",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "40px",
              textAlign: "center",
            }}
          >
            {threshold}%
          </span>
        </div>
      )}

      {/* Colormap dropdowns */}
      {isLoaded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "8px 16px",
            backgroundColor: sliderBg,
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: sliderText,
              minWidth: "70px",
            }}
          >
            Colormaps
          </span>
          <div style={{ display: "flex", gap: "8px", flex: 1, maxWidth: "200px" }}>
            <select
              value={colormapPositive}
              onChange={(e) => setColormapPositive(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                color: sliderText,
                backgroundColor: isDark ? "#27272a" : "#f3f4f6",
                border: `1px solid ${isDark ? "#3f3f46" : "#e5e7eb"}`,
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              {POSITIVE_COLORMAPS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={colormapNegative}
              onChange={(e) => setColormapNegative(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                color: sliderText,
                backgroundColor: isDark ? "#27272a" : "#f3f4f6",
                border: `1px solid ${isDark ? "#3f3f46" : "#e5e7eb"}`,
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              {NEGATIVE_COLORMAPS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <span style={{ minWidth: "40px" }} />
        </div>
      )}
    </div>
  );
}

export default BrainViewer;
