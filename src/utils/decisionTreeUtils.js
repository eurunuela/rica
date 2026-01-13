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
 * Get classification path for a specific component
 * @param {string} componentId - Component identifier (e.g., "ICA_00")
 * @param {Object} componentPaths - Parsed status table data
 * @returns {Array} Array of {nodeIndex, classification} objects showing the path
 */
export function getComponentPath(componentId, componentPaths) {
  if (!componentPaths || !componentPaths[componentId]) {
    return [];
  }

  return componentPaths[componentId].nodes;
}

/**
 * Get nodes that led to a specific classification outcome
 * @param {Array} nodes - Array of parsed tree nodes
 * @param {string} classification - Target classification (e.g., "accepted", "rejected")
 * @returns {Array} Array of node indices that can lead to this classification
 */
export function getNodesForClassification(nodes, classification) {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  return nodes
    .filter((node) => {
      return node.ifTrue === classification || node.ifFalse === classification;
    })
    .map((node) => node.index);
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
 * Check if a node is a calculation node
 * @param {Object} node - Parsed tree node
 * @returns {boolean} True if node performs calculations only
 */
export function isCalculationNode(node) {
  if (!node || !node.functionName) return false;
  return node.functionName.startsWith("calc_");
}

/**
 * Get final classification for a component from its path
 * @param {Object} componentPath - Component path from parseStatusTable
 * @returns {string} Final classification state
 */
export function getFinalClassification(componentPath) {
  if (!componentPath || !componentPath.nodes || componentPath.nodes.length === 0) {
    return componentPath?.initial || "unclassified";
  }

  // Return classification from last node in path
  const lastNode = componentPath.nodes[componentPath.nodes.length - 1];
  return lastNode.classification;
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

/**
 * Build a hierarchical tree structure for visualization
 * @param {Array} nodes - Array of parsed tree nodes
 * @returns {Object} Root node of hierarchical tree
 */
export function buildHierarchicalTree(nodes) {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  // For sequential execution, build a simple linear tree
  // where each node has up to two children based on if_true and if_false outcomes

  // Start with root node
  const root = {
    name: "Start",
    label: "All Components",
    nodeIndex: -1,
    children: [],
  };

  // Build tree structure
  // Note: tedana's tree is sequential, not branching
  // So we create a visualization that shows decision outcomes

  let currentParent = root;

  nodes.forEach((node, index) => {
    if (isCalculationNode(node)) {
      // Calculation nodes don't branch, add as single child
      const calcNode = {
        name: node.label,
        label: node.label,
        nodeIndex: index,
        type: "calc",
        children: [],
      };
      currentParent.children.push(calcNode);
      currentParent = calcNode;
    } else if (isDecisionNode(node)) {
      // Decision nodes create branches
      const decisionNode = {
        name: node.label,
        label: node.label,
        nodeIndex: index,
        type: "decision",
        nTrue: node.nTrue,
        nFalse: node.nFalse,
        children: [],
      };

      // Add true branch
      if (node.nTrue > 0) {
        decisionNode.children.push({
          name: `${node.ifTrue} (${node.nTrue})`,
          label: `${node.ifTrue}`,
          nodeIndex: index,
          branch: "true",
          count: node.nTrue,
          type: "outcome",
          children: [],
        });
      }

      // Add false branch
      if (node.nFalse > 0) {
        decisionNode.children.push({
          name: `${node.ifFalse} (${node.nFalse})`,
          label: `${node.ifFalse}`,
          nodeIndex: index,
          branch: "false",
          count: node.nFalse,
          type: "outcome",
          children: [],
        });
      }

      currentParent.children.push(decisionNode);

      // Continue from the larger branch
      if (decisionNode.children.length > 0) {
        currentParent = decisionNode.children[0];
      }
    }
  });

  return root;
}
