import React, { useMemo } from "react";
import DecisionTree from "./DecisionTree";
import { parseDecisionTree, parseStatusTable } from "../utils/decisionTreeUtils";

/**
 * Decision Tree Tab Container
 *
 * Container component for the decision tree visualization.
 * Parses the tree data and status table, then passes to DecisionTree component.
 */
function DecisionTreeTab({ decisionTreeData, statusTableData, componentData, isDark }) {
  // Parse decision tree and status table
  const parsedTree = useMemo(() => {
    if (!decisionTreeData) return null;
    return parseDecisionTree(decisionTreeData);
  }, [decisionTreeData]);

  const componentPaths = useMemo(() => {
    if (!statusTableData) return {};
    return parseStatusTable(statusTableData);
  }, [statusTableData]);

  // If no data, show message
  if (!parsedTree || !componentPaths) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          padding: "48px 24px",
          color: "var(--text-secondary)",
        }}
      >
        <svg
          style={{ width: "64px", height: "64px", marginBottom: "16px", opacity: 0.5 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
          No Decision Tree Data
        </h3>
        <p style={{ fontSize: "14px", maxWidth: "400px", textAlign: "center", lineHeight: "1.6" }}>
          This tedana output does not include decision tree files.
          <br />
          Ensure your output contains both <code style={{ padding: "2px 6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "4px" }}>decision_tree.json</code> and <code style={{ padding: "2px 6px", backgroundColor: "var(--bg-tertiary)", borderRadius: "4px" }}>status_table.tsv</code>.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 60px)",
        backgroundColor: "var(--bg-primary)",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Decision Tree Visualization
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            margin: "4px 0 0 0",
          }}
        >
          Explore how tedana classified each component through the decision tree
        </p>
      </div>

      {/* Tree Info Summary */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-default)",
          backgroundColor: "var(--bg-elevated)",
          fontSize: "13px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Tree:</span>
          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
            {parsedTree.treeId}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Nodes:</span>
          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
            {parsedTree.nodes.length}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--text-secondary)" }}>Components:</span>
          <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
            {Object.keys(componentPaths).length}
          </span>
        </div>
      </div>

      {/* Decision Tree Visualization */}
      <div
        style={{
          padding: "24px",
        }}
      >
        <DecisionTree
          treeData={parsedTree}
          componentPaths={componentPaths}
          componentData={componentData}
          isDark={isDark}
        />
      </div>
    </div>
  );
}

export default DecisionTreeTab;
