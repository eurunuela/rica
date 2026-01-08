import React, { useState, useMemo } from "react";
import NiivueMosaic from "./NiivueMosaic";

// Helper to extract a clean label from filename
function getLabel(filename) {
  // Remove prefix like "sub-01_" and extension
  const match = filename.match(/(?:sub-\d+_)?(.+?)\.svg$/);
  if (match) {
    return match[1]
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return filename;
}

// Group figures by category - only non-brain SVGs
function groupFigures(figures) {
  const groups = {
    "Histograms": [],
    "Time Series": [],
    "Other": [],
  };

  figures.forEach((fig) => {
    const name = fig.name.toLowerCase();
    // Skip brain figures (Niivue) and confound correlations (shown in ICA tab)
    if (name.includes("_brain.svg") || name.includes("_mask.svg") || name.includes("confound_correlations")) {
      return;
    }
    if (name.includes("histogram")) {
      groups["Histograms"].push(fig);
    } else if (name.includes("timeseries")) {
      groups["Time Series"].push(fig);
    } else {
      groups["Other"].push(fig);
    }
  });

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, figs]) => figs.length > 0)
  );
}

// Brain map types available
const BRAIN_MAPS = [
  { key: "t2star", label: "T2* Map" },
  { key: "s0", label: "S0 Map" },
  { key: "rmse", label: "RMSE Map" },
];

function Diagnostics({ images = [], qcNiftiBuffers = {}, maskBuffer, isDark = false }) {
  const [selectedCategory, setSelectedCategory] = useState("brainMaps");
  const [selectedBrainMap, setSelectedBrainMap] = useState("t2star");
  const [selectedImage, setSelectedImage] = useState(null);

  const groupedImages = useMemo(() => groupFigures(images), [images]);
  const svgCategories = Object.keys(groupedImages);

  // Check which brain maps are available
  const availableBrainMaps = useMemo(() => {
    return BRAIN_MAPS.filter((map) => qcNiftiBuffers[map.key]);
  }, [qcNiftiBuffers]);

  const hasBrainMaps = availableBrainMaps.length > 0;
  const hasSvgFigures = svgCategories.length > 0;

  // Auto-select first image when switching to SVG category
  React.useEffect(() => {
    if (selectedCategory !== "brainMaps" && groupedImages[selectedCategory]?.length > 0) {
      setSelectedImage(groupedImages[selectedCategory][0]);
    }
  }, [selectedCategory, groupedImages]);

  // Auto-select first brain map if available
  React.useEffect(() => {
    if (hasBrainMaps && !qcNiftiBuffers[selectedBrainMap]) {
      setSelectedBrainMap(availableBrainMaps[0].key);
    }
  }, [hasBrainMaps, selectedBrainMap, qcNiftiBuffers, availableBrainMaps]);

  if (!hasBrainMaps && !hasSvgFigures) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
          color: "var(--text-tertiary)",
          fontSize: "14px",
        }}
      >
        No diagnostic figures available
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        gap: "16px",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
      }}
    >
      {/* Main category tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {hasBrainMaps && (
          <button
            onClick={() => setSelectedCategory("brainMaps")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              backgroundColor:
                selectedCategory === "brainMaps"
                  ? "var(--accent-accepted)"
                  : "var(--bg-secondary)",
              color:
                selectedCategory === "brainMaps"
                  ? isDark ? "#0a0a0b" : "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Brain Maps ({availableBrainMaps.length})
          </button>
        )}
        {svgCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-default)",
              backgroundColor:
                selectedCategory === cat
                  ? "var(--accent-accepted)"
                  : "var(--bg-secondary)",
              color:
                selectedCategory === cat
                  ? isDark ? "#0a0a0b" : "#ffffff"
                  : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cat} ({groupedImages[cat].length})
          </button>
        ))}
      </div>

      {/* Brain Maps content */}
      {selectedCategory === "brainMaps" && hasBrainMaps && (
        <>
          {/* Brain map selector */}
          {availableBrainMaps.length > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {availableBrainMaps.map((map) => (
                <button
                  key={map.key}
                  onClick={() => setSelectedBrainMap(map.key)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor:
                      selectedBrainMap === map.key
                        ? "var(--bg-tertiary)"
                        : "transparent",
                    color:
                      selectedBrainMap === map.key
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {map.label}
                </button>
              ))}
            </div>
          )}

          {/* Niivue brain viewer - mosaic with 3 rows (always black background) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#000000",
              borderRadius: "8px",
              overflow: "hidden",
              width: "100%",
              flex: 1,
              minHeight: "500px",
            }}
          >
            <NiivueMosaic
              key={selectedBrainMap}
              niftiBuffer={qcNiftiBuffers[selectedBrainMap]}
              maskBuffer={maskBuffer}
              mapType={selectedBrainMap}
              width="100%"
              isDark={isDark}
            />
          </div>
        </>
      )}

      {/* SVG Figures content */}
      {selectedCategory !== "brainMaps" && groupedImages[selectedCategory] && (
        <>
          {/* Figure selector within category */}
          {groupedImages[selectedCategory].length > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {groupedImages[selectedCategory].map((fig) => (
                <button
                  key={fig.name}
                  onClick={() => setSelectedImage(fig)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor:
                      selectedImage?.name === fig.name
                        ? "var(--bg-tertiary)"
                        : "transparent",
                    color:
                      selectedImage?.name === fig.name
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {getLabel(fig.name)}
                </button>
              ))}
            </div>
          )}

          {/* SVG Image display */}
          {selectedImage && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                {getLabel(selectedImage.name)}
              </div>
              <img
                src={selectedImage.img}
                alt={selectedImage.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "calc(100vh - 350px)",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Diagnostics;
