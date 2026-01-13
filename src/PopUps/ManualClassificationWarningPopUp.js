import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { LOGO_DATA_URL } from "../constants/logo";

function ManualClassificationWarningPopUp({ closePopup, isDark }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(4px)",
      }}
      onClick={closePopup}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "480px",
          margin: "0 24px",
          backgroundColor: "var(--bg-elevated)",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closePopup}
          type="button"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M13.7 0.3c-0.4-0.4-1-0.4-1.4 0L7 5.6 1.7 0.3c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4L5.6 7l-5.3 5.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.4 0.3 0.7 0.3s0.5-0.1 0.7-0.3L7 8.4l5.3 5.3c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4L8.4 7l5.3-5.3c0.4-0.4 0.4-1 0-1.4z" />
          </svg>
        </button>

        <div style={{ padding: "32px" }}>
          {/* Header with logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <img
              src={LOGO_DATA_URL}
              alt="Rica"
              style={{ width: "36px", height: "36px" }}
            />
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Manual Classifications Detected
              </h1>
            </div>
          </div>

          {/* Info box */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px 16px",
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)",
              borderRadius: "10px",
              marginBottom: "20px",
              border: `1px solid ${isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}`,
            }}
          >
            <FontAwesomeIcon
              icon={faInfoCircle}
              style={{
                fontSize: "18px",
                color: isDark ? "#60a5fa" : "#3b82f6",
                marginTop: "2px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  margin: 0,
                  marginBottom: "8px",
                }}
              >
                This folder contains a <strong>manual_classification.tsv</strong> file with previously saved classifications.
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Your previous manual classifications have been loaded and are displayed in the component table.
              </p>
            </div>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            <strong>To start fresh:</strong>
          </p>

          <ul
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              lineHeight: 1.8,
              marginBottom: "24px",
              paddingLeft: "20px",
            }}
          >
            <li>
              Delete <code style={{ 
                backgroundColor: "var(--bg-tertiary)", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "13px"
              }}>manual_classification.tsv</code> from your tedana folder, or
            </li>
            <li>
              Use the <strong>Reset</strong> button in Rica to revert to the original tedana classifications
            </li>
          </ul>

          {/* Action button */}
          <button
            onClick={closePopup}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "44px",
              fontSize: "14px",
              fontWeight: 500,
              color: isDark ? "#0a0a0b" : "#ffffff",
              backgroundColor: isDark ? "#fafafa" : "#111827",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualClassificationWarningPopUp;
