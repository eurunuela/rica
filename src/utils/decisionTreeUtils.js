/**
 * Decision Tree Utilities
 *
 * Functions for parsing and manipulating tedana decision tree data
 */

/**
 * Parse decision tree JSON and extract relevant information
 * @param {Object} treeJson - Raw decision tree JSON from tedana
 * @returns {Object} Parsed tree data with nodes and metadata
 */
export function parseDecisionTree(treeJson) {
  if (!treeJson || !treeJson.nodes) {
    return null;
  }

  // Extract nodes with their outputs
  const nodes = treeJson.nodes.map((node, index) => {
    const outputs = node.outputs || {};
    const params = node.parameters || {};
    const kwargs = node.kwargs || {};

    return {
      index,
      functionName: node.functionname || "",
      label: outputs.node_label || kwargs.custom_node_label || `Node ${index}`,
      nTrue: outputs.n_true || 0,
      nFalse: outputs.n_false || 0,
      usedMetrics: outputs.used_metrics || [],
      decideComps: params.decide_comps || "all",
      ifTrue: params.if_true || "nochange",
      ifFalse: params.if_false || "nochange",
      operator: params.op || "",
      left: params.left || "",
      right: params.right || "",
      tagIfTrue: kwargs.tag_if_true || "",
      tagIfFalse: kwargs.tag_if_false || "",
      comment: node._comment || "",
    };
  });

  return {
    treeId: treeJson.tree_id || "unknown",
    info: treeJson.info || "",
    report: treeJson.report || "",
    nodes,
    necessaryMetrics: treeJson.necessary_metrics || [],
    generatedMetrics: treeJson.generated_metrics || [],
    intermediateClassifications: treeJson.intermediate_classifications || [],
    classificationTags: treeJson.classification_tags || [],
  };
}

/**
 * Parse status table TSV and build component path data
 * @param {Array} statusTableData - Parsed TSV data from PapaParse
 * @returns {Object} Map of component ID to classification path
 */
export function parseStatusTable(statusTableData) {
  if (!statusTableData || statusTableData.length === 0) {
    return {};
  }

  const componentPaths = {};

  statusTableData.forEach((row) => {
    const componentId = row.Component || row.component;
    if (!componentId) return;

    // Extract classification at each node
    const path = {
      component: componentId,
      initial: row["initialized classification"] || row["initial classification"] || "unclassified",
      nodes: [],
    };

    // Find all "Node X" columns
    Object.keys(row).forEach((key) => {
      const nodeMatch = key.match(/^Node (\d+)$/);
      if (nodeMatch) {
        const nodeIndex = parseInt(nodeMatch[1], 10);
        const classification = row[key];
        if (classification) {
          path.nodes.push({
            nodeIndex,
            classification,
          });
        }
      }
    });

    componentPaths[componentId] = path;
  });

  return componentPaths;
}

/**
 * Check if a node is a decision node (vs calculation node)
 * @param {Object} node - Parsed tree node
 * @returns {boolean} True if node makes classification decisions
 */
export function isDecisionNode(node) {
  if (!node || !node.functionName) return false;
  return node.functionName.startsWith("dec_");
}

/**
 * Get nodes that affected a specific component's classification
 * @param {string} componentId - Component identifier
 * @param {Object} componentPaths - Parsed status table data
 * @returns {Array} Array of node indices where classification changed
 */
export function getAffectingNodes(componentId, componentPaths) {
  if (!componentPaths || !componentPaths[componentId]) {
    return [];
  }

  const path = componentPaths[componentId];
  const affectingNodes = [];

  let previousClassification = path.initial;

  path.nodes.forEach((node) => {
    if (node.classification !== previousClassification) {
      affectingNodes.push(node.nodeIndex);
      previousClassification = node.classification;
    }
  });

  return affectingNodes;
}
