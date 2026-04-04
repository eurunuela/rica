import React, { useCallback } from "react";

const titleCase = (str) =>
  str
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

function ToggleSwitch({ values, selected, colors, handleNewSelection, isDark = false, counts = null }) {
  const tabWidth = counts ? 110 : 90;
  const selectionStyle = useCallback(() => {
    const index = values.indexOf(selected);
    if (index === -1) return { display: 'none' };
    return {
      left: `${index * tabWidth}px`,
      background: colors[index],
    };
  }, [values, selected, colors, tabWidth]);

  return (
    <div style={{
      position: 'relative',
      height: '36px',
      fontWeight: 600,
      backgroundColor: isDark ? '#27272a' : '#e5e7eb',
      borderRadius: '8px',
      display: 'flex',
    }}>
      {values.map((val) => (
        <span key={val}>
          <input
            style={{ display: 'none' }}
            type="radio"
            name="switch"
            checked={selected === val}
            readOnly
          />
          <label
            onClick={() => handleNewSelection(val)}
            style={{
              position: 'relative',
              zIndex: 10,
              height: '36px',
              width: `${tabWidth}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              color: selected === val ? '#1f2937' : (isDark ? '#a1a1aa' : 'rgba(0,0,0,0.6)'),
              fontSize: '13px',
            }}
          >
            {counts ? `${titleCase(val)} (${counts[val] ?? 0})` : titleCase(val)}
          </label>
        </span>
      ))}
      <span
        style={{
          ...selectionStyle(),
          position: 'absolute',
          top: 0,
          zIndex: 0,
          display: 'block',
          height: '36px',
          width: `${tabWidth}px`,
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
      />
    </div>
  );
}

export default ToggleSwitch;
