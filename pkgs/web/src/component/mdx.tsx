import "@code-hike-local/mdx/dist/index.css";
import "./github-markdown.css";

import * as runtime from "react/jsx-runtime";
// @ts-ignore
import addClasses from "rehype-add-classes";
import type { CSSProperties, ErrorInfo, FC, PropsWithChildren } from "react";
import { compile, run } from "@mdx-js/mdx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CH } from "@code-hike-local/mdx/components";
import { ErrorBoundary } from "react-error-boundary";
import type { MDXContent } from "mdx/types";
import { remarkCodeHike } from "@code-hike-local/mdx";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { IoMdShareAlt as ShareForward } from "react-icons/io";
import cls from "classnames";
import { useTreeNoteStore } from "./tree-graph/store";
import { selectLang } from "./tree-graph/selector";
import { useNodeId } from "reactflow";
import { ThemeMode } from "types";
import { useThemeMode } from "./hooks";

type Mode = Exclude<ThemeMode, "system">;
const themeMap = {
  light: "light-plus",
  dark: "dark-plus",
};

async function compileAndRun(input: string, mode: Mode) {
  try {
    const c = await compile(input, {
      outputFormat: "function-body",
      rehypePlugins: [
        // @ts-ignore
        rehypeKatex,
        [
          addClasses,
          {
            table: "not-prose",
          },
        ],
      ],
      remarkPlugins: [
        remarkMath,
        remarkGfm,
        [
          remarkCodeHike,
          {
            theme: themeMap[mode], // https://codehike.org/docs/themes
            lineNumbers: true, // https://codehike.org/docs/configuration
            showCopyButton: false,
            autoImport: false,
            autoLink: false,
            triggerPosition: "50%",
          },
        ],
      ],
    });
    // @ts-ignore
    const x = await run(String(c), runtime);
    return { content: x.default, error: undefined };
  } catch (e) {
    if (e instanceof Error) {
      return { content: undefined, error: e.message };
    } else if (typeof e === "string") {
      return { content: undefined, error: e };
    }
    return { content: undefined, error: "unknown error" };
  }
}
const compileIds = new Map<string, number>();
function useInput(input: string, width: number, id: string, mode: Exclude<ThemeMode, "system">) {
  const [{ Component, error }, setState] = useState<{
    Component: MDXContent | undefined;
    error: string | undefined;
  }>({
    Component: undefined,
    error: undefined,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const compileId = compileIds.get(id) || 0;
    if (compileId === 0) {
      compileIds.set(id, 0);
    }
    // console.log("compiling...", compileId, input.length, width);
    setLoading(true);
    compileAndRun(input, mode).then(({ content, error }) => {
      // console.log("compiled", compileId, error, input.length, width);
      if (compileId !== compileIds.get(id)) {
        // console.log("skipping", compileId, input.length, width);
        return;
      }
      setState({
        Component: content,
        error: error,
      });
      if (error) {
        console.log("mdx compile error: ", input, error, width);
      }
      setLoading(false);
    });
    return () => {
      // console.log("cancelling", id, input.length, width);
      compileIds.set(id, compileIds.get(id)! + 1);
    };
  }, [id, input, width, mode]);

  return { Component, error, loading };
}

function ErrorFallback({ error }: { error: string }) {
  return (
    <div className="preview-error">
      <h3>Runtime Error:</h3>
      <pre>{String(error)}</pre>
    </div>
  );
}

const InnerPreview: FC<MDXProps & { mode: Mode }> = ({ mdx, width, id, mode, scrollRootHeight }) => {
  // trigger rerender when width changed

  const { Component, error, loading } = useInput(mdx, width, id, mode);
  let style: CSSProperties = {};
  if (id.startsWith("scrolly-") && typeof scrollRootHeight === "number") {
    style.overflow = "auto";
    style.height = scrollRootHeight;
  }
  const lang = useTreeNoteStore(selectLang);
  const components = useMemo(() => {
    if (lang === "en") {
      return {
        CH,
        Reference,
        LangZh: () => null,
        LangEn,
      };
    } else if (lang === "zh") {
      return {
        CH,
        Reference,
        LangZh,
        LangEn: () => null,
      };
    }
  }, [lang]);
  return (
    <>
      {error ? (
        <div className="compile-error">
          <h3>Compilation Error:</h3>
          <pre>{error}</pre>
        </div>
      ) : null}
      <div
        className={cls("preview-container markdown-body prose dark:prose-invert", {
          "with-error": error,
        })}
        style={style}
        id={id}
      >
        {/* <div style={{ opacity: loading ? 1 : 0 }} className="loading-border" /> */}
        {Component ? <Component components={components} /> : null}
      </div>
    </>
  );
};

const logError = (error: Error, info: ErrorInfo) => {
  console.log("error boundary:", error, info);
};

type MDXProps = {
  mdx: string;
  width: number;
  id: string;
  scrollRootHeight?: number;
};
// trigger rerender on width changes
const MDX: FC<MDXProps> = ({ mdx, width, id, scrollRootHeight }) => {
  const mode = useThemeMode();
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <InnerPreview mdx={mdx} width={width} id={id} mode={mode} scrollRootHeight={scrollRootHeight} />
    </ErrorBoundary>
  );
};

function LangZh({ children }: PropsWithChildren<{}>) {
  return <div className="lang-zh">{children}</div>;
}
function LangEn({ children }: PropsWithChildren<{}>) {
  return <div className="lang-en">{children}</div>;
}

type ReferenceProps = {
  to: string;
};
function Reference({ to, children }: PropsWithChildren<ReferenceProps>) {
  const { historyForward } = useTreeNoteStore();
  const id = useNodeId();
  const onClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      // console.log("reference to", "id:", id, "to:", to);
      if (id) {
        historyForward(id, to);
      }
    },
    [historyForward, id, to]
  );
  return (
    <span
      className="reference ignore-activate text-xs cursor-pointer  bg-blue-100 py-[1px] px-0.5 rounded-sm dark:bg-blue-800"
      onClick={onClick}
    >
      <span className="mr-0.5">some {children}</span>
      <sup>
        <ShareForward className="inline" />
      </sup>
    </span>
  );
}

export default MDX;
