// import "@code-hike-local/mdx/dist/index.css";

import * as runtime from "react/jsx-runtime";

import type { CSSProperties, ErrorInfo, FC, PropsWithChildren } from "react";
import { compile, run } from "@mdx-js/mdx";
import { useCallback, useEffect, useState } from "react";

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
import { selectLangClass } from "./tree-graph/selector";
import { useNodeId } from "reactflow";

async function compileAndRun(input: string) {
  try {
    const c = await compile(input, {
      outputFormat: "function-body",
      rehypePlugins: [
        // @ts-ignore
        rehypeKatex,
      ],
      remarkPlugins: [
        remarkMath,
        remarkGfm,
        [
          remarkCodeHike,
          {
            theme: "light-plus", // https://codehike.org/docs/themes
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
function useInput(input: string, width: number, id: string) {
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
    compileAndRun(input).then(({ content, error }) => {
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
  }, [id, input, width]);

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

const InnerPreview: FC<{ input: string; width: number; id: string }> = ({ input, width, id }) => {
  // trigger rerender when width changed

  const langClass = useTreeNoteStore(selectLangClass);
  const { Component, error, loading } = useInput(input, width, id);
  let style: CSSProperties = {};
  if (id.startsWith("scrolly-")) {
    style.overflow = "auto";
    style.height = 800;
  }
  return (
    <>
      {error ? (
        <div className="compile-error">
          <h3>Compilation Error:</h3>
          <pre>{error}</pre>
        </div>
      ) : null}
      <div
        className={cls(
          "preview-container",
          {
            "with-error": error,
          },
          langClass
        )}
        style={style}
        id={id}
      >
        {/* <div style={{ opacity: loading ? 1 : 0 }} className="loading-border" /> */}
        {Component ? <Component components={{ CH, LangZh, LangEn, Reference }} /> : null}
      </div>
    </>
  );
};

const logError = (error: Error, info: ErrorInfo) => {
  console.log("error boundary:", error, info);
};

// trigger rerender on width changes
const MDX: FC<{ mdx: string; width: number; id: string }> = ({ mdx, width, id }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <InnerPreview input={mdx} width={width} id={id} />
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
    <span className="reference ignore-activate text-xs cursor-pointer  bg-blue-100 p-1 rounded-sm " onClick={onClick}>
      <span className="mr-0.5">some {children}</span>
      <sup>
        <ShareForward className="inline" />
      </sup>
    </span>
  );
}

export default MDX;
