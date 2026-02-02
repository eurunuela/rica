import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Niivue } from "@niivue/niivue";

// Get appropriate colormap based on map type (all work with black background)
function getColormap(mapType) {
  switch (mapType) {
    case "t2star":
    case "s0":
      return "gray";
    case "rmse":
      return "hot";
    case "mask":
      return "blue";
    default:
      return "gray";
  }
}

// Get gamma value for colormap - higher gamma makes low values darker
function getGamma(mapType) {
  switch (mapType) {
    case "rmse":
      return 1.5; // Make low values darker so background appears black
    default:
      return 1.0;
  }
}

// Get display title
function getTitle(mapType) {
  switch (mapType) {
    case "t2star":
      return "T2* Map";
    case "s0":
      return "S0 Map";
    case "rmse":
      return "RMSE Map";
    case "mask":
      return "Adaptive Mask";
    default:
      return "Brain Map";
  }
}

// Generate mosaic string with slices in mm coordinates
// Format: "A -40 -20 0 20 40 ; S -40 -20 0 20 40 ; C -40 -20 0 20 40"
// Each orientation gets its own row (separated by semicolons)
// extents = { axial: [min, max], sagittal: [min, max], coronal: [min, max] }
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

// Calculate number of slices based on container width
function calculateNumSlices(containerWidth) {
  // More slices now that height is working - fixed at 7 slices
  return 7;
}

function NiivueMosaic({ niftiBuffer, maskBuffer, mapType = "gray", width, height, isDark = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nvRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [contrast, setContrast] = useState(50); // 50% by default (0-100 range)
  const [threshold, setThreshold] = useState(0); // Threshold 0-100%
  const [selectedColormap, setSelectedColormap] = useState(null); // null = default based on mapType
  const [sliceOffset, setSliceOffset] = useState(0); // Center offset (-0.5 to 0.5)
  const [numSlices, setNumSlices] = useState(6); // Default number of slices
  const [volumeExtents, setVolumeExtents] = useState(null); // Store volume extents for mosaic
  const maxValRef = useRef(null); // Store max value for contrast adjustments

  // Colormap options
  const SEQUENTIAL_COLORMAPS = [
    { value: "gray", label: "Gray" },
    { value: "hot", label: "Hot" },
    { value: "bone", label: "Bone" },
    { value: "viridis", label: "Viridis" },
    { value: "plasma", label: "Plasma" },
    { value: "inferno", label: "Inferno" },
    { value: "magma", label: "Magma" },
    { value: "cividis", label: "Cividis" },
  ];

  // Brain viewer always has black background
  const canvasBgColor = "#000000";

  // Theme colors for UI elements (title, sliders, etc.)
  const titleColor = isDark ? "#fafafa" : "#374151";
  const loadingBg = "#000000";
  const loadingText = "#a1a1aa";
  const errorBg = isDark ? "#451a1a" : "#fef2f2";
  const errorText = isDark ? "#fca5a5" : "#dc2626";
  const placeholderBg = "#000000";
  const placeholderText = "#71717a";
  const sliderBg = isDark ? "#18181b" : "#ffffff";
  const sliderTrack = isDark ? "#3f3f46" : "#e5e7eb";
  const sliderThumb = isDark ? "#a1a1aa" : "#6b7280";
  const sliderText = isDark ? "#a1a1aa" : "#6b7280";

  // Niivue background color (RGBA 0-1) - always black for brain viewer
  const niivueBgColor = useMemo(
    () => [0, 0, 0, 1],
    []
  );

  const colormap = selectedColormap || getColormap(mapType);
  const gamma = getGamma(mapType);
  const title = getTitle(mapType);

  // Reset contrast to 50% and selectedColormap to null when map type changes
  useEffect(() => {
    setContrast(50);
    setThreshold(0);
    setSelectedColormap(null);
  }, [mapType]);

  // Calculate number of slices based on container width
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSliceCount = () => {
      const containerWidth = containerRef.current?.offsetWidth || 800;
      const newNumSlices = calculateNumSlices(containerWidth);
      setNumSlices(newNumSlices);
    };

    // Initial calculation
    updateSliceCount();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateSliceCount);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Initialize Niivue instance
  useEffect(() => {
    let mounted = true;
    let blobUrl = null;

    async function initNiivue() {
      if (!canvasRef.current || !niftiBuffer) return;

      try {
        // Create Niivue instance
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

        // Load volume
        const blob = new Blob([niftiBuffer], { type: "application/gzip" });
        blobUrl = URL.createObjectURL(blob);

        // Load main volume
        const isRmse = mapType === "rmse";
        await nv.loadVolumes([
          {
            url: blobUrl,
            name: `${mapType}.nii.gz`,
            colormap: colormap,
            opacity: 1.0,
            cal_min: 0.001, // Threshold out zeros/near-zeros (outside brain)
            colorbarVisible: false,
          },
        ]);

        // Apply settings after loading
        if (nv.volumes.length > 0) {
          const vol = nv.volumes[0];

          // Invert colormap for RMSE so high values are black (outside brain)
          if (isRmse) {
            vol.colormapInvert = true;
          }

          // Apply gamma to make low values darker
          if (gamma !== 1.0) {
            vol.gamma = gamma;
          }

          // Update the volume rendering
          nv.updateGLVolume();
          nv.drawScene();
        }

        // Get volume extents for mosaic slice positions
        let extents = null;
        if (nv.volumes.length > 0) {
          const vol = nv.volumes[0];
          maxValRef.current = vol.cal_max;

          // Get extents in mm for each axis
          // extentsMin/Max are [x, y, z] in world coordinates
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
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (nvRef.current) {
        nvRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niftiBuffer, mapType]);

  // Update mosaic when slice offset or number of slices changes
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

  // Update colormap range when contrast or threshold changes
  // Higher contrast (0-100) = lower cal_max = more visual contrast (colors saturate faster)
  useEffect(() => {
    if (nvRef.current && isLoaded && maxValRef.current) {
      try {
        const nv = nvRef.current;
        if (nv.volumes && nv.volumes.length > 0) {
          const vol = nv.volumes[0];
          // Map contrast 0-100 to multiplier 2.0-0.2
          // contrast 0 = washed out, contrast 100 = saturated
          const multiplier = 2 - (contrast / 100) * 1.8;
          const newMax = maxValRef.current * multiplier;
          vol.cal_max = newMax;

          // Apply threshold (0-100% range, with minimum of 0.001)
          const thresholdVal = Math.max(0.001, maxValRef.current * (threshold / 200));
          vol.cal_min = thresholdVal;

          nv.updateGLVolume();
          nv.drawScene();
        }
      } catch (err) {
        console.error("Error updating contrast/threshold:", err);
      }
    }
  }, [contrast, threshold, isLoaded]);

  // Update colormap when selectedColormap changes
  useEffect(() => {
    if (nvRef.current && isLoaded && maxValRef.current) {
      try {
        const nv = nvRef.current;
        if (nv.volumes && nv.volumes.length > 0) {
          const vol = nv.volumes[0];
          vol.colormap = colormap;

          // Preserve colormapInvert for RMSE maps regardless of colormap
          if (mapType === "rmse") {
            vol.colormapInvert = true;
          }

          // Preserve contrast and threshold when changing colormap
          const multiplier = 2 - (contrast / 100) * 1.8;
          const newMax = maxValRef.current * multiplier;
          vol.cal_max = newMax;
          const thresholdVal = Math.max(0.001, maxValRef.current * (threshold / 200));
          vol.cal_min = thresholdVal;

          nv.updateGLVolume();
          nv.drawScene();
        }
      } catch (err) {
        console.error("Error updating colormap:", err);
      }
    }
  }, [selectedColormap, isLoaded, colormap, mapType, contrast, threshold]);

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
          height: height || 400,
          background: placeholderBg,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: placeholderText,
          fontSize: 14,
        }}
      >
        No data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: width || "100%",
        height: "100%",
        position: "relative",
        background: canvasBgColor,
        display: "flex",
        flexDirection: "column",
        flex: 1,
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
        {title}
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
          Loading...
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
          minHeight: "400px",
          display: "block",
          outline: "none",
          backgroundColor: canvasBgColor,
        }}
      />

      {/* Controls: Position, Contrast, Threshold sliders and Colormap dropdown */}
      {isLoaded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "8px 16px",
            backgroundColor: sliderBg,
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
          }}
        >
          {/* Position slider - navigate through brain */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
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
                height: "4px",
                appearance: "none",
                background: sliderTrack,
                borderRadius: "2px",
                cursor: "pointer",
                accentColor: sliderThumb,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: sliderText,
                minWidth: "40px",
                textAlign: "right",
              }}
            >
              {sliceOffset > 0 ? "+" : ""}{Math.round(sliceOffset * 100)}%
            </span>
          </div>
          {/* Contrast slider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: sliderText,
                minWidth: "70px",
              }}
            >
              Contrast
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={contrast}
              onChange={(e) => setContrast(parseInt(e.target.value))}
              style={{
                flex: 1,
                maxWidth: "200px",
                height: "4px",
                appearance: "none",
                background: sliderTrack,
                borderRadius: "2px",
                cursor: "pointer",
                accentColor: sliderThumb,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: sliderText,
                minWidth: "40px",
                textAlign: "right",
              }}
            >
              {contrast}%
            </span>
          </div>
          {/* Threshold slider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
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
              max="100"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              style={{
                flex: 1,
                maxWidth: "200px",
                height: "4px",
                appearance: "none",
                background: sliderTrack,
                borderRadius: "2px",
                cursor: "pointer",
                accentColor: sliderThumb,
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: sliderText,
                minWidth: "40px",
                textAlign: "right",
              }}
            >
              {threshold}%
            </span>
          </div>
          {/* Colormap dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: sliderText,
                minWidth: "70px",
              }}
            >
              Colormap
            </span>
            <select
              value={selectedColormap || getColormap(mapType)}
              onChange={(e) => setSelectedColormap(e.target.value)}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                color: sliderText,
                backgroundColor: isDark ? "#27272a" : "#f3f4f6",
                border: `1px solid ${isDark ? "#3f3f46" : "#e5e7eb"}`,
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
                maxWidth: "200px",
              }}
            >
              {SEQUENTIAL_COLORMAPS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span style={{ minWidth: "40px" }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default NiivueMosaic;
