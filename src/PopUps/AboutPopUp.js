import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import { LOGO_DATA_URL } from "../constants/logo";
import { VERSION_DISPLAY } from "../constants/version";

function AboutPopup({ closePopup, isDark }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={closePopup}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          margin: '0 24px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '16px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closePopup}
          type="button"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M13.7 0.3c-0.4-0.4-1-0.4-1.4 0L7 5.6 1.7 0.3c-0.4-0.4-1-0.4-1.4 0s-0.4 1 0 1.4L5.6 7l-5.3 5.3c-0.4 0.4-0.4 1 0 1.4 0.2 0.2 0.4 0.3 0.7 0.3s0.5-0.1 0.7-0.3L7 8.4l5.3 5.3c0.2 0.2 0.5 0.3 0.7 0.3s0.5-0.1 0.7-0.3c0.4-0.4 0.4-1 0-1.4L8.4 7l5.3-5.3c0.4-0.4 0.4-1 0-1.4z"/>
          </svg>
        </button>

        <div style={{ padding: '32px' }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <img
              src={LOGO_DATA_URL}
              alt="Rica"
              style={{ width: '36px', height: '36px' }}
            />
            <div>
              <h1 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                Rica
              </h1>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                margin: 0,
                marginTop: '2px',
              }}>
                {VERSION_DISPLAY}
              </p>
            </div>
          </div>

          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '12px'
          }}>
            An interactive visualization tool for reviewing and classifying ICA components from tedana analysis.
          </p>

          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '24px'
          }}>
            Questions or contributions welcome.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href="https://me-ica.github.io/rica/"
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '44px',
                fontSize: '14px',
                fontWeight: 500,
                color: isDark ? '#0a0a0b' : '#ffffff',
                backgroundColor: isDark ? '#fafafa' : '#111827',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <FontAwesomeIcon icon={faBook} />
              Documentation
            </a>
            <a
              href="https://github.com/ME-ICA/rica"
              target="_blank"
              rel="noreferrer noopener"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '44px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <FontAwesomeIcon icon={faGithub} />
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPopup;
