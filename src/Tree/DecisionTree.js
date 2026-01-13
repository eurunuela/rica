import React, { useState, useMemo, useCallback } from "react";
import { isDecisionNode, getAffectingNodes } from "../utils/decisionTreeUtils";

/**
 * Decision Tree Visualization Component
 *
 * Displays tedana's sequential decision tree as an interactive flow chart.
 * Shows nodes, conditions, and component counts with click interactions.
 */
function DecisionTree({ treeData, componentPaths, componentData, isDark }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);

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
    (node) => {
      setSelectedNode(node.index);
      setSelectedComponent(null);
    },
    []
  );

  // Handle component click
  const handleComponentClick = useCallback((componentId) => {
    setSelectedComponent(componentId);
    setSelectedNode(null);
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
      style={{
        display: "flex",
        gap: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* Tree Flow - Left Side */}
      <div
        style={{
          flex: 2,
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
                onClick={() => handleNodeClick(node)}
                style={{
                  padding: "16px",
                  backgroundColor: isSelected ? colors.bgHover : colors.bgElevated,
                  border: `2px solid ${
                    isSelected ? colors.selected : isAffecting ? colors.decision : colors.border
                  }`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  opacity: shouldDim ? 0.4 : 1,
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
                    padding: "8px 0",
                  }}
                >
                  <div
                    style={{
                      width: "2px",
                      height: "32px",
                      backgroundColor: colors.border,
                      opacity: shouldDim ? 0.4 : 1,
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Component Details - Right Side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: "120px",
          alignSelf: "flex-start",
          maxHeight: "calc(100vh - 160px)",
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
            flex: 1,
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
                      onClick={() => handleComponentClick(id)}
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
                    onClick={() => handleComponentClick(id)}
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
      </div>
    </div>
  );
}

export default DecisionTree;
