import React, { useMemo, useCallback } from "react";
import { Group } from "@visx/group";
import { scaleBand } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { useTooltip, useTooltipInPortal, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { formatComponentName } from "./PlotUtils";

// Diverging color scale: blue (negative) -> white (zero) -> red (positive)
// Using more saturated colors for better visibility
const getCorrelationColor = (value, isDark) => {
  // Clamp value between -1 and 1
  const v = Math.max(-1, Math.min(1, value));

  if (v < 0) {
    // Blue for negative correlations - more saturated
    const intensity = Math.abs(v);
    if (isDark) {
      // Dark mode: vibrant blues
      const r = Math.round(30 + (240 - 30) * (1 - intensity));
      const g = Math.round(100 + (240 - 100) * (1 - intensity));
      const b = Math.round(255);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: strong blues (not pastel)
      const r = Math.round(50 + (255 - 50) * (1 - intensity));
      const g = Math.round(100 + (255 - 100) * (1 - intensity));
      const b = Math.round(220 + (255 - 220) * (1 - intensity));
      return `rgb(${r}, ${g}, ${b})`;
    }
  } else {
    // Red for positive correlations - more saturated
    const intensity = v;
    if (isDark) {
      // Dark mode: vibrant reds
      const r = 255;
      const g = Math.round(240 - (240 - 60) * intensity);
      const b = Math.round(240 - (240 - 60) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Light mode: strong reds (not pastel)
      const r = Math.round(255);
      const g = Math.round(255 - (255 - 50) * intensity);
      const b = Math.round(255 - (255 - 50) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
};

// Increased right margin to make room for colorbar
const margin = { top: 60, right: 100, bottom: 100, left: 100 };

function CorrelationHeatmap({
  data,              // Array of component objects from metrics TSV
  regressorColumns,  // Array of column names for external regressors
  width,
  height,
  selectedIndex,
  onCellClick,
  isDark = false,
}) {
  // Theme colors
  const colors = {
    bg: isDark ? '#18181b' : '#ffffff',
    title: isDark ? '#fafafa' : '#374151',
    axis: isDark ? '#71717a' : '#9ca3af',
    axisLabel: isDark ? '#a1a1aa' : '#374151',
    tickLabel: isDark ? '#a1a1aa' : '#6b7280',
    cellStroke: isDark ? '#27272a' : '#e5e7eb',
    selectedStroke: isDark ? '#fafafa' : '#1f2937',
  };

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  // Extract component labels for y-axis
  const componentLabels = useMemo(() => {
    return data.map(d => d.Component || d.label || `Component ${data.indexOf(d)}`);
  }, [data]);

  // Clean up regressor names for display (remove "external regressor correlation " prefix)
  const cleanRegressorNames = useMemo(() => {
    return regressorColumns.map(col =>
      col.replace(/^external regressor correlation\s*/i, '')
    );
  }, [regressorColumns]);

  // Calculate dimensions
  const innerWidth = Math.max(0, (width || 0) - margin.left - margin.right);
  const innerHeight = Math.max(0, (height || 0) - margin.top - margin.bottom);

  // Scales
  const xScale = useMemo(() => {
    if (!cleanRegressorNames.length || innerWidth <= 0) return null;
    return scaleBand({
      domain: cleanRegressorNames,
      range: [0, innerWidth],
      padding: 0.05,
    });
  }, [cleanRegressorNames, innerWidth]);

  const yScale = useMemo(() => {
    if (!componentLabels.length || innerHeight <= 0) return null;
    return scaleBand({
      domain: componentLabels,
      range: [0, innerHeight],
      padding: 0.05,
    });
  }, [componentLabels, innerHeight]);


  const handleMouseOver = useCallback((event, component, regressor, value, componentIndex) => {
    const coords = localPoint(event);
    showTooltip({
      tooltipData: { component, regressor, value, componentIndex },
      tooltipLeft: coords?.x,
      tooltipTop: coords?.y,
    });
  }, [showTooltip]);

  // Guard against invalid dimensions
  if (!width || !height || width < 10 || height < 10 || !xScale || !yScale || !data.length || !regressorColumns.length) {
    return <div style={{ width: "100%", height: "100%", background: colors.bg, borderRadius: 8 }} />;
  }

  const cellWidth = xScale.bandwidth();
  const cellHeight = yScale.bandwidth();

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg width={width} height={height}>
        {/* Background */}
        <rect
          width={width}
          height={height}
          fill={colors.bg}
          rx={8}
        />

        {/* Title */}
        <text
          x={width / 2}
          y={28}
          textAnchor="middle"
          fontSize={16}
          fontWeight="bold"
          fill={colors.title}
        >
          External Regressor Correlations
        </text>

        <Group left={margin.left} top={margin.top}>
          {/* Heatmap cells */}
          {data.map((component, rowIndex) => {
            const componentLabel = componentLabels[rowIndex];
            const y = yScale(componentLabel);
            const isSelectedRow = rowIndex === selectedIndex;

            return regressorColumns.map((regressorCol, colIndex) => {
              const regressorName = cleanRegressorNames[colIndex];
              const x = xScale(regressorName);
              const value = component[regressorCol] ?? 0;

              return (
                <rect
                  key={`${rowIndex}-${colIndex}`}
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  fill={getCorrelationColor(value, isDark)}
                  stroke={isSelectedRow ? colors.selectedStroke : colors.cellStroke}
                  strokeWidth={isSelectedRow ? 2 : 0.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => handleMouseOver(e, componentLabel, regressorName, value, rowIndex)}
                  onMouseLeave={hideTooltip}
                  onClick={() => onCellClick(rowIndex)}
                />
              );
            });
          })}

          {/* Y-axis (Components) */}
          <AxisLeft
            scale={yScale}
            stroke={colors.axis}
            tickStroke={colors.axis}
            tickLabelProps={() => ({
              fill: colors.tickLabel,
              fontSize: 10,
              textAnchor: "end",
              dy: "0.33em",
              dx: -4,
            })}
            tickFormat={(label) => formatComponentName(label)}
          />

          {/* X-axis (Regressors) - rotated labels */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke={colors.axis}
            tickStroke={colors.axis}
            tickLabelProps={() => ({
              fill: colors.tickLabel,
              fontSize: 10,
              textAnchor: "start",
              angle: 45,
              dx: 4,
              dy: -4,
            })}
          />
        </Group>

        {/* Color legend - positioned after heatmap with proper spacing */}
        <Group left={margin.left + innerWidth + 20} top={margin.top + innerHeight / 2 - 60}>
          <text
            x={10}
            y={-15}
            fontSize={11}
            fill={colors.axisLabel}
            textAnchor="middle"
          >
            Correlation
          </text>

          {/* Legend gradient */}
          <defs>
            <linearGradient id="correlation-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={getCorrelationColor(-1, isDark)} />
              <stop offset="50%" stopColor={getCorrelationColor(0, isDark)} />
              <stop offset="100%" stopColor={getCorrelationColor(1, isDark)} />
            </linearGradient>
          </defs>

          <rect
            x={0}
            y={0}
            width={20}
            height={120}
            fill="url(#correlation-gradient)"
            stroke={colors.cellStroke}
          />

          {/* Legend labels */}
          <text x={25} y={8} fontSize={10} fill={colors.tickLabel}>1</text>
          <text x={25} y={62} fontSize={10} fill={colors.tickLabel}>0</text>
          <text x={25} y={118} fontSize={10} fill={colors.tickLabel}>-1</text>
        </Group>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          left={tooltipLeft}
          top={tooltipTop}
          style={{
            ...defaultStyles,
            backgroundColor: "#1f2937",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            {formatComponentName(tooltipData.component)}
          </div>
          <div>
            {tooltipData.regressor}: {tooltipData.value.toFixed(3)}
          </div>
        </TooltipInPortal>
      )}
    </div>
  );
}

export default CorrelationHeatmap;
