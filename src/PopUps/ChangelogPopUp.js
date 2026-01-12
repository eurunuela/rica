import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faExternalLinkAlt, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { LOGO_DATA_URL } from "../constants/logo";
import { VERSION_DISPLAY, VERSION } from "../constants/version";

const GITHUB_RELEASES_URL = "https://api.github.com/repos/ME-ICA/rica/releases";

function ChangelogPopUp({ closePopup, isDark, onVersionSeen }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await fetch(GITHUB_RELEASES_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch releases: ${response.status}`);
        }
        const data = await response.json();
        setReleases(data.slice(0, 10)); // Show last 10 releases
        setLoading(false);
      } catch (err) {
        console.error("Error fetching releases:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchReleases();
  }, []);

  // Mark version as seen when popup is closed
  const handleClose = () => {
    if (onVersionSeen) {
      onVersionSeen(VERSION);
    }
    closePopup();
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Parse markdown-style body to simple HTML
  const parseBody = (body) => {
    if (!body) return "";
    // Convert markdown links to plain text
    let parsed = body.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Convert **bold** to strong
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Convert bullet points
    parsed = parsed.replace(/^- /gm, "• ");
    parsed = parsed.replace(/^\* /gm, "• ");
    // Limit length
    if (parsed.length > 500) {
      parsed = parsed.substring(0, 500) + "...";
    }
    return parsed;
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
      onClick={handleClose}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          maxHeight: "80vh",
          margin: "0 16px",
          backgroundColor: "var(--bg-elevated)",
          borderRadius: "16px",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            color: "var(--text-tertiary)",
            transition: "all 0.15s ease",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
          title="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 4L12 12M12 4L4 12" />
          </svg>
        </button>

        {/* Header */}
        <div style={{ padding: "32px 32px 16px 32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <img
              src={LOGO_DATA_URL}
              alt="Rica"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
              }}
            />
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                What's New
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                Current version: {VERSION_DISPLAY}
              </p>
            </div>
          </div>
        </div>

        {/* Content area with scroll */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 32px 24px 32px",
            minHeight: "200px",
            maxHeight: "50vh",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 0",
                color: "var(--text-secondary)",
              }}
            >
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                style={{ marginRight: "8px" }}
              />
              Loading releases...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "24px",
                backgroundColor: isDark
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(239, 68, 68, 0.05)",
                borderRadius: "8px",
                color: isDark ? "#fca5a5" : "#dc2626",
                fontSize: "14px",
              }}
            >
              <p style={{ margin: 0, marginBottom: "8px", fontWeight: "500" }}>
                Unable to load releases
              </p>
              <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && releases.length === 0 && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              No releases found.
            </div>
          )}

          {!loading && !error && releases.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {releases.map((release, index) => (
                <div
                  key={release.id}
                  style={{
                    padding: "16px",
                    backgroundColor:
                      index === 0
                        ? isDark
                          ? "rgba(59, 130, 246, 0.1)"
                          : "rgba(59, 130, 246, 0.05)"
                        : "var(--bg-secondary)",
                    borderRadius: "12px",
                    border:
                      index === 0
                        ? `1px solid ${isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}`
                        : "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        {release.tag_name}
                      </span>
                      {index === 0 && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "500",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: isDark ? "#3b82f6" : "#2563eb",
                            color: "#fff",
                          }}
                        >
                          Latest
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {formatDate(release.published_at)}
                    </span>
                  </div>
                  {release.name && release.name !== release.tag_name && (
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "var(--text-primary)",
                        margin: "0 0 8px 0",
                      }}
                    >
                      {release.name}
                    </p>
                  )}
                  {release.body && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                      }}
                      dangerouslySetInnerHTML={{ __html: parseBody(release.body) }}
                    />
                  )}
                  <a
                    href={release.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: isDark ? "#60a5fa" : "#2563eb",
                      textDecoration: "none",
                      marginTop: "8px",
                    }}
                  >
                    View on GitHub
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      style={{ fontSize: "10px" }}
                    />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 32px 24px 32px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <a
            href="https://github.com/ME-ICA/rica/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "500",
              color: "#fff",
              backgroundColor: isDark ? "#27272a" : "#18181b",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "#3f3f46"
                : "#27272a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? "#27272a"
                : "#18181b";
            }}
          >
            <FontAwesomeIcon icon={faGithub} />
            View All Releases
          </a>
        </div>
      </div>
    </div>
  );
}

export default ChangelogPopUp;
