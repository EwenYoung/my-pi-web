"use client";

import { useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { sql } from "@codemirror/lang-sql";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { basicSetup } from "codemirror";

interface Props {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  isDark?: boolean;
  fontSize?: number;
}

const langMap: Record<string, () => import("@codemirror/language").LanguageSupport> = {
  javascript: () => javascript({ typescript: false, jsx: true }),
  typescript: () => javascript({ typescript: true, jsx: true }),
  jsx: () => javascript({ typescript: false, jsx: true }),
  tsx: () => javascript({ typescript: true, jsx: true }),
  python: () => python(),
  css: () => css(),
  scss: () => css(),
  json: () => json(),
  html: () => html(),
  markdown: () => markdown(),
  xml: () => xml(),
  yaml: () => yaml(),
  yml: () => yaml(),
  sql: () => sql(),
  java: () => java(),
  c: () => cpp(),
  cpp: () => cpp(),
  csharp: () => cpp(),
};

function getLangExtension(language: string) {
  const fn = langMap[language];
  return fn ? fn() : null;
}

export default function CodeMirrorEditor({ value, onChange, language, isDark, fontSize = 13 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const langCompRef = useRef(new Compartment());
  const themeCompRef = useRef(new Compartment());
  const docSyncRef = useRef(true);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    const langComp = langCompRef.current;
    const themeComp = themeCompRef.current;

    const syncListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        langComp.of(getLangExtension(language ?? "text") ?? []),
        themeComp.of(isDark ? oneDark : syntaxHighlighting(defaultHighlightStyle)),
        EditorView.theme({
          "&": { fontSize: `${fontSize}px`, height: "100%" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "var(--font-mono)", caretColor: "var(--text)" },
          "&.cm-focused": { outline: "none" },
        }),
        syncListener,
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update doc from external changes (file reload / undo)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // Update language
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const lang = getLangExtension(language ?? "text");
    view.dispatch({
      effects: langCompRef.current.reconfigure(lang ?? []),
    });
  }, [language]);

  // Update theme
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompRef.current.reconfigure(
        isDark ? oneDark : syntaxHighlighting(defaultHighlightStyle)
      ),
    });
  }, [isDark]);

  return (
    <div
      ref={editorRef}
      style={{ height: "100%", overflow: "hidden" }}
    />
  );
}
