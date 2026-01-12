import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck, faExternalLinkAlt, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { LOGO_DATA_URL } from "../constants/logo";
import { VERSION_DISPLAY } from "../constants/version";

// Zenodo concept DOI for Rica (points to all versions)
const ZENODO_CONCEPT_DOI = "10.5281/zenodo.5788349";
const ZENODO_API_URL = "https://zenodo.org/api/records?q=conceptrecid:5788349&sort=-version&size=1";

function CitationPopUp({ closePopup, isDark }) {
  const [zenodoData, setZenodoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchZenodoData = async () => {
      try {
        const response = await fetch(ZENODO_API_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch Zenodo data: ${response.status}`);
        }
        const data = await response.json();
        if (data.hits?.hits?.length > 0) {
          setZenodoData(data.hits.hits[0]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching Zenodo data:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchZenodoData();
  }, []);

  // Get the DOI to display (use latest version DOI if available, otherwise concept DOI)
  const displayDoi = zenodoData?.doi || ZENODO_CONCEPT_DOI;
  const doiUrl = `https://doi.org/${displayDoi}`;

  // Get authors from Zenodo data
  const authors = zenodoData?.metadata?.creators?.map(c => c.name).join(", ") || "Uruñuela, E., DuPre, E., & Handwerker, D. A.";

  // Get publication year
  const year = zenodoData?.metadata?.publication_date?.split("-")[0] || new Date().getFullYear();

  // Generate citation text
  const citationText = `${authors} (${year}). Rica: Reports for ICA (Version ${zenodoData?.metadata?.version || VERSION_DISPLAY.replace("v", "")}). Zenodo. https://doi.org/${displayDoi}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
          maxWidth: "560px",
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
                Cite Rica
              </h1>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  margin: 0,
                  marginTop: "2px",
                }}
              >
                {VERSION_DISPLAY}
              </p>
            </div>
          </div>

          {/* Success message */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              backgroundColor: isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.08)",
              borderRadius: "10px",
              marginBottom: "20px",
              border: `1px solid ${isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(34, 197, 94, 0.2)"}`,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? "#4ade80" : "#16a34a"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: isDark ? "#4ade80" : "#16a34a",
              }}
            >
              Classification saved successfully!
            </span>
          </div>

          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "16px",
            }}
          >
            If you use Rica in your research, please cite it using the reference below.
          </p>

          {/* Loading state */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                color: "var(--text-secondary)",
              }}
            >
              <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: "8px" }} />
              Loading citation data...
            </div>
          )}

          {/* Error notice - still show citation with fallback values */}
          {!loading && error && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
                marginBottom: "12px",
                fontStyle: "italic",
              }}
            >
              Note: Using cached citation data (Zenodo unavailable)
            </p>
          )}

          {/* Citation box */}
          {!loading && (
            <div
              style={{
                position: "relative",
                padding: "16px",
                backgroundColor: "var(--bg-secondary)",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  lineHeight: 1.7,
                  margin: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                  wordBreak: "break-word",
                }}
              >
                {citationText}
              </p>
              <button
                onClick={handleCopy}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: copied ? (isDark ? "#4ade80" : "#16a34a") : "var(--text-secondary)",
                  backgroundColor: copied
                    ? isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.1)"
                    : "var(--bg-tertiary)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.currentTarget.style.backgroundColor = "var(--bg-elevated)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copied) {
                    e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          {/* DOI badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <a
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <img
                src="https://zenodo.org/badge/391155862.svg"
                alt="DOI Badge"
                style={{ height: "20px" }}
              />
            </a>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <a
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "44px",
                fontSize: "14px",
                fontWeight: 500,
                color: "#fff",
                backgroundColor: "#0277bd",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#01579b")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0277bd")}
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              View on Zenodo
            </a>
            <button
              onClick={closePopup}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "44px",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-default)",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitationPopUp;
