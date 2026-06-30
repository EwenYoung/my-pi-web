"use client";

import { useState, useEffect, useCallback } from "react";

interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface DirListResponse {
  dir: string;
  parent: string | null;
  items: DirEntry[];
  error?: string;
}

interface DirectoryBrowserProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function DirectoryBrowser({ initialPath = "~", onSelect, onCancel }: DirectoryBrowserProps) {
  const [currentDir, setCurrentDir] = useState(initialPath);
  const [parentDir, setParentDir] = useState<string | null>(null);
  const [items, setItems] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fs/list?dir=${encodeURIComponent(dir)}`);
      const data: DirListResponse = await res.json();
      if (data.error) {
        setError(data.error);
        setItems([]);
      } else {
        setCurrentDir(data.dir);
        setParentDir(data.parent);
        setItems(data.items.filter((i) => i.isDir)); // Only show directories
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDir(initialPath);
  }, [initialPath, loadDir]);

  const handleSelect = (entry: DirEntry) => {
    if (entry.isDir) {
      loadDir(entry.path);
    }
  };

  const handleGoUp = () => {
    if (parentDir) {
      loadDir(parentDir);
    }
  };

  const handleConfirm = () => {
    onSelect(currentDir);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: 600,
          maxHeight: "80vh",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Select Project Directory
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <button
              onClick={handleGoUp}
              disabled={!parentDir || loading}
              style={{
                padding: "4px 8px",
                background: parentDir ? "var(--bg-hover)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: 5,
                color: parentDir ? "var(--text)" : "var(--text-dim)",
                cursor: parentDir ? "pointer" : "not-allowed",
                fontSize: 11,
                fontWeight: 600,
                opacity: parentDir ? 1 : 0.5,
              }}
            >
              ↑ Up
            </button>
            <div
              style={{
                flex: 1,
                padding: "4px 8px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentDir}
            </div>
          </div>
        </div>

        {/* Directory list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              Loading…
            </div>
          ) : error ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#dc2626", fontSize: 12 }}>
              {error}
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              No subdirectories
            </div>
          ) : (
            items.map((entry) => (
              <button
                key={entry.path}
                onClick={() => handleSelect(entry)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  color: "var(--text)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 12,
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M2 3h3l1 1h4v6H2V3z" />
                </svg>
                <span>{entry.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-panel)",
            display: "flex",
            gap: 8,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "var(--bg-hover)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Select This Directory
          </button>
        </div>
      </div>
    </div>
  );
}
