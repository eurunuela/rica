import React, { useState, useMemo, useCallback } from "react";
import { isDecisionNode, getAffectingNodes } from "../utils/decisionTreeUtils";
import TimeSeries from "../Plots/TimeSeries";
import BrainViewer from "../Plots/BrainViewer";
import FFTSpectrum from "../Plots/FFTSpectrum";
import { formatComponentName } from "../Plots/PlotUtils";

/**
 * Decision Tree Visualization Component
 *
 * Displays tedana's sequential decision tree as an interactive flow chart.
 * Shows nodes, conditions, and component counts with click interactions.
 */
function DecisionTree({ treeData, componentPaths, componentData, mixingMatrix, niftiBuffer, maskBuffer, isDark }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [colormapSaturation, setColormapSaturation] = useState(0.25);

  // Theme colors
  const colors = useMemo(
    () => ({
      bg: isDark ? "#18181b" : "#ffffff",
      bgElevated: isDark ? "#27272a" : "#f3f4f6",
      bgHover: isDark ? "#3f3f46" : "#e5e7eb",
      text: isDark ? "#fafafa" : "#111827",
      textSecondary: isDark ? "#a1a1aa" : "#6b7280",
      border: isDark ? "#3f3f46" : "#d1d5db",
      borderHover: isDark ? "#52525b" : "#9ca3af",
      accepted: isDark ? "#4ade80" : "#22c55e",
      rejected: isDark ? "#f87171" : "#ef4444",
      calc: isDark ? "#60a5fa" : "#3b82f6",
      decision: isDark ? "#c084fc" : "#a855f7",
      selected: isDark ? "#3b82f6" : "#2563eb",
    }),
    [isDark]
  );

  // Get components affected by a node
  const getAffectedComponents = useCallback(
    (nodeIndex) => {
      const affected = [];
      Object.entries(componentPaths).forEach(([componentId, path]) => {
        const affectingNodes = getAffectingNodes(componentId, componentPaths);
        if (affectingNodes.includes(nodeIndex)) {
          affected.push({
            id: componentId,
            path,
          });
        }
      });
      return affected;
    },
    [componentPaths]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (node, e) => {
      e.stopPropagation();
      setSelectedNode(node.index);
      setSelectedComponent(null);
    },
    []
  );

  // Handle component click
  const handleComponentClick = useCallback((componentId, e) => {
    e.stopPropagation();
    setSelectedComponent(componentId);
    setSelectedNode(null);
  }, []);

  // Handle reset (click outside)
  const handleReset = useCallback(() => {
    setSelectedNode(null);
    setSelectedComponent(null);
  }, []);

  // Get affected components for selected node
  const affectedComponents = useMemo(() => {
    if (selectedNode === null) return [];
    return getAffectedComponents(selectedNode);
  }, [selectedNode, getAffectedComponents]);

  // Get affecting nodes for selected component
  const affectingNodeIndices = useMemo(() => {
    if (!selectedComponent) return [];
    return getAffectingNodes(selectedComponent, componentPaths);
  }, [selectedComponent, componentPaths]);

  // Get component index and data for visualizations
  const selectedComponentIndex = useMemo(() => {
    if (!selectedComponent || !componentData || !Array.isArray(componentData)) return null;

    // componentData is passed as [array], so get the first element
    const dataArray = Array.isArray(componentData[0]) ? componentData[0] : componentData;
    if (!Array.isArray(dataArray) || dataArray.length === 0) return null;

    const index = dataArray.findIndex((comp) => comp.Component === selectedComponent);
    return index >= 0 ? index : null;
  }, [selectedComponent, componentData]);

  // Get time series data for selected component
  const currentTimeSeries = useMemo(() => {
    if (selectedComponentIndex === null || !mixingMatrix || !Array.isArray(mixingMatrix)) return null;
    try {
      return mixingMatrix.map((row) => row[selectedComponentIndex]);
    } catch (error) {
      console.error("Error extracting time series:", error);
      return null;
    }
  }, [selectedComponentIndex, mixingMatrix]);

  // Get component label
  const currentComponentLabel = useMemo(() => {
    if (!selectedComponent) return "";
    return formatComponentName(selectedComponent);
  }, [selectedComponent]);

  // Get classification for selected component
  const selectedClassification = useMemo(() => {
    if (!selectedComponent || !componentPaths[selectedComponent]) return "accepted";
    const path = componentPaths[selectedComponent];
    const finalClass = path.nodes[path.nodes.length - 1]?.classification || path.initial;
    return finalClass === "accepted" ? "accepted" : "rejected";
  }, [selectedComponent, componentPaths]);

  // Check if we have interactive views available
  const hasInteractiveViews = mixingMatrix && niftiBuffer && maskBuffer;

  // Theme-aware colors for visualizations
  const getColors = useCallback((isDark) => ({
    accepted: isDark ? "#4ade80" : "#86EFAC",
    acceptedHover: isDark ? "#22c55e" : "#22C55E",
    rejected: isDark ? "#f87171" : "#FCA5A5",
    rejectedHover: isDark ? "#ef4444" : "#EF4444",
  }), []);

  if (!treeData || !treeData.nodes || treeData.nodes.length === 0) {
    return (
      <div
        style={{
          padding: "48px",
          textAlign: "center",
          color: colors.textSecondary,
        }}
      >
        <p>No decision tree nodes to display.</p>
      </div>
    );
  }

  return (
    <div
      onClick={handleReset}
      style={{
        display: "flex",
        gap: "24px",
        maxWidth: "100%",
        margin: "0 auto",
      }}
    >
      {/* Tree Flow - Left Side */}
      <div
        style={{
          flex: 1,
          minWidth: "300px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: colors.text,
            marginBottom: "16px",
          }}
        >
          Decision Tree Flow
        </h3>
        {treeData.nodes.map((node, index) => {
          const isDecision = isDecisionNode(node);
          const isSelected = selectedNode === index;
          const isAffecting = affectingNodeIndices.includes(index);
          const isLastNode = index === treeData.nodes.length - 1;
          const hasSelection = selectedNode !== null || selectedComponent !== null;
          const shouldDim = hasSelection && !isSelected && !isAffecting;

          return (
            <div key={index} style={{ display: "flex", flexDirection: "column" }}>
              {/* Node Card */}
              <div
                onClick={(e) => handleNodeClick(node, e)}
                style={{
                  padding: shouldDim ? "8px 16px" : "16px",
                  backgroundColor: isSelected ? colors.bgHover : colors.bgElevated,
                  border: `2px solid ${
                    isSelected ? colors.selected : isAffecting ? colors.decision : colors.border
                  }`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  opacity: shouldDim ? 0.4 : 1,
                  maxHeight: shouldDim ? "60px" : "none",
                  overflow: shouldDim ? "hidden" : "visible",
                }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = colors.bgHover;
                  e.currentTarget.style.borderColor = colors.borderHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = colors.bgElevated;
                  e.currentTarget.style.borderColor = isAffecting ? colors.decision : colors.border;
                }
              }}
            >
              {/* Node Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: colors.textSecondary,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Node {index}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      backgroundColor: isDecision ? colors.decision : colors.calc,
                      color: "#fff",
                      borderRadius: "4px",
                      fontWeight: "600",
                    }}
                  >
                    {isDecision ? "Decision" : "Calculation"}
                  </span>
                </div>
                {isDecision && (
                  <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                    <span style={{ color: colors.textSecondary }}>
                      True: <strong style={{ color: colors.text }}>{node.nTrue}</strong>
                    </span>
                    <span style={{ color: colors.textSecondary }}>
                      False: <strong style={{ color: colors.text }}>{node.nFalse}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Node Label */}
              <div style={{ fontSize: "14px", fontWeight: "600", color: colors.text, marginBottom: "4px" }}>
                {node.label}
              </div>

              {/* Node Details */}
              {isDecision && (
                <div style={{ fontSize: "12px", color: colors.textSecondary, marginTop: "8px" }}>
                  {node.operator && (
                    <div>
                      Condition: <code style={{ padding: "2px 6px", backgroundColor: colors.bg, borderRadius: "4px" }}>
                        {node.left} {node.operator} {node.right}
                      </code>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                    {node.ifTrue !== "nochange" && (
                      <span>
                        If true → <strong>{node.ifTrue}</strong>
                      </span>
                    )}
                    {node.ifFalse !== "nochange" && (
                      <span>
                        If false → <strong>{node.ifFalse}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Comment */}
              {node.comment && (
                <div
                  style={{
                    fontSize: "11px",
                    color: colors.textSecondary,
                    marginTop: "8px",
                    fontStyle: "italic",
                  }}
                >
                  {node.comment}
                </div>
              )}
              </div>

              {/* Connecting Line */}
              {!isLastNode && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: shouldDim ? "4px 0" : "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      height: shouldDim ? "16px" : "32px",
                      backgroundColor: colors.border,
                      opacity: shouldDim ? 0.4 : 1,
                      transition: "all 0.2s ease",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Component Details and Visualizations - Right Side */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 3,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: "0px",
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 120px)",
          gap: "16px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: colors.text,
            marginBottom: "12px",
          }}
        >
          {selectedNode !== null ? "Affected Components" : "All Components"}
        </h3>

        {/* Component List */}
        <div
          style={{
            minHeight: selectedComponent ? "150px" : "auto",
            maxHeight: selectedComponent ? "200px" : "none",
            overflow: "auto",
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "12px",
          }}
        >
          {selectedNode !== null ? (
            // Show components affected by selected node
            affectedComponents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {affectedComponents.map(({ id, path }) => {
                  const finalClass = path.nodes[path.nodes.length - 1]?.classification || path.initial;
                  const isAccepted = finalClass === "accepted";
                  const isRejected = finalClass === "rejected";

                  return (
                    <div
                      key={id}
                      onClick={(e) => handleComponentClick(id, e)}
                      style={{
                        padding: "10px",
                        backgroundColor: colors.bg,
                        border: `1px solid ${selectedComponent === id ? colors.selected : colors.border}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.borderHover;
                      }}
                      onMouseLeave={(e) => {
                        if (selectedComponent !== id) {
                          e.currentTarget.style.borderColor = colors.border;
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: colors.text }}>
                          {id.replace("_", " ")}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            backgroundColor: isAccepted ? colors.accepted : isRejected ? colors.rejected : colors.textSecondary,
                            color: "#fff",
                            borderRadius: "4px",
                            fontWeight: "600",
                          }}
                        >
                          {finalClass}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: colors.textSecondary, fontSize: "13px", textAlign: "center", padding: "24px" }}>
                No components were affected by this node.
              </p>
            )
          ) : (
            // Show all components
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(componentPaths).map(([id, path]) => {
                const finalClass = path.nodes[path.nodes.length - 1]?.classification || path.initial;
                const isAccepted = finalClass === "accepted";
                const isRejected = finalClass === "rejected";

                return (
                  <div
                    key={id}
                    onClick={(e) => handleComponentClick(id, e)}
                    style={{
                      padding: "10px",
                      backgroundColor: colors.bg,
                      border: `1px solid ${selectedComponent === id ? colors.selected : colors.border}`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.borderHover;
                    }}
                    onMouseLeave={(e) => {
                      if (selectedComponent !== id) {
                        e.currentTarget.style.borderColor = colors.border;
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: colors.text }}>
                        {id.replace("_", " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          backgroundColor: isAccepted ? colors.accepted : isRejected ? colors.rejected : colors.textSecondary,
                          color: "#fff",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        {finalClass}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Component Path */}
        {selectedComponent && componentPaths[selectedComponent] && (
          <div
            style={{
              marginTop: "16px",
              padding: "16px",
              backgroundColor: colors.bgElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
            }}
          >
            <h4 style={{ fontSize: "13px", fontWeight: "600", color: colors.text, marginBottom: "4px" }}>
              Classification Path
            </h4>
            <p style={{ fontSize: "12px", color: colors.textSecondary, marginBottom: "12px" }}>
              {selectedComponent.replace("_", " ")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Initial state */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    backgroundColor: colors.textSecondary,
                    color: "#fff",
                    borderRadius: "4px",
                    fontWeight: "600",
                  }}
                >
                  {componentPaths[selectedComponent].initial}
                </span>
                <span style={{ color: colors.textSecondary }}>Initial</span>
              </div>

              {/* Changes at each node */}
              {componentPaths[selectedComponent].nodes.map((node, idx) => {
                const prev = idx === 0 ? componentPaths[selectedComponent].initial : componentPaths[selectedComponent].nodes[idx - 1].classification;
                const changed = node.classification !== prev;

                if (!changed) return null;

                const isAccepted = node.classification === "accepted";
                const isRejected = node.classification === "rejected";

                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                    <span style={{ color: colors.textSecondary }}>↓</span>
                    <span
                      style={{
                        padding: "4px 10px",
                        backgroundColor: isAccepted ? colors.accepted : isRejected ? colors.rejected : colors.textSecondary,
                        color: "#fff",
                        borderRadius: "4px",
                        fontWeight: "600",
                      }}
                    >
                      {node.classification}
                    </span>
                    <span style={{ color: colors.textSecondary }}>Node {node.nodeIndex}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Component Visualizations */}
        {selectedComponent && hasInteractiveViews && selectedComponentIndex !== null && currentTimeSeries && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              backgroundColor: colors.bgElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <h4 style={{ fontSize: "13px", fontWeight: "600", color: colors.text, marginBottom: "4px" }}>
              Component Visualization
            </h4>

            {/* Time series */}
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <TimeSeries
                data={currentTimeSeries}
                width={600}
                height={120}
                title="Time Series"
                componentLabel={currentComponentLabel}
                lineColor={selectedClassification === 'accepted' ? getColors(isDark).acceptedHover : getColors(isDark).rejectedHover}
                isDark={isDark}
              />
            </div>

            {/* Brain stat map viewer */}
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <BrainViewer
                niftiBuffer={niftiBuffer}
                maskBuffer={maskBuffer}
                componentIndex={selectedComponentIndex}
                width={600}
                height={220}
                componentLabel={currentComponentLabel}
                saturation={colormapSaturation}
                isDark={isDark}
              />
            </div>

            {/* Saturation slider */}
            <div style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "4px 0",
            }}>
              <label htmlFor="tree-saturation-slider" style={{ fontSize: "11px", color: colors.textSecondary }}>
                Saturation:
              </label>
              <input
                id="tree-saturation-slider"
                type="range"
                min="1"
                max="100"
                value={colormapSaturation * 100}
                onChange={(e) => setColormapSaturation(parseFloat(e.target.value) / 100)}
                style={{
                  width: "200px",
                  cursor: "pointer",
                  accentColor: "#3b82f6",
                }}
              />
              <span style={{ fontSize: "11px", color: colors.textSecondary, minWidth: "35px", textAlign: "right" }}>
                {Math.round(colormapSaturation * 100)}%
              </span>
            </div>

            {/* FFT spectrum */}
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <FFTSpectrum
                timeSeries={currentTimeSeries}
                width={600}
                height={120}
                title="Power Spectrum"
                sampleRate={1}
                lineColor={selectedClassification === 'accepted' ? getColors(isDark).acceptedHover : getColors(isDark).rejectedHover}
                isDark={isDark}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DecisionTree;
