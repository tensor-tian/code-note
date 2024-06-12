import "@code-hike-local/mdx/dist/index.css";

import * as runtime from "react/jsx-runtime";

import type { ErrorInfo, FC } from "react";
import { compile, run } from "@mdx-js/mdx";
import { useEffect, useState } from "react";

import { CH } from "@code-hike-local/mdx/components";
import { ErrorBoundary } from "react-error-boundary";
import type { MDXContent } from "mdx/types";
import { remarkCodeHike } from "@code-hike-local/mdx";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import cls from "classnames";

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

let effectId = 0;
function useInput(input: string, width: number) {
  const [{ Component, error }, setState] = useState<{
    Component: MDXContent | undefined;
    error: string | undefined;
  }>({
    Component: undefined,
    error: undefined,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = effectId;
    // console.log("compiling...", id);
    setLoading(true);
    compileAndRun(input).then(({ content, error }) => {
      // console.log("compiled", id, error);
      if (id !== effectId) {
        // console.log("skipping", id);
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
      // console.log("cancelling", id);
      effectId++;
    };
  }, [input, width]);

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

const InnerPreview: FC<{ input: string; width: number }> = ({ input, width }) => {
  // trigger rerender when width changed
  const { Component, error, loading } = useInput(input, width);
  // console.log("error:", error, typeof Component);
  // const style = typeof maxWidth === "number" ? { maxWidth } : {};
  return (
    <>
      {error ? (
        <div className="compile-error">
          <h3>Compilation Error:</h3>
          <pre>{error}</pre>
        </div>
      ) : null}
      <div
        className={cls("preview-container", {
          "with-error": error,
        })}
      >
        {/* <div style={{ opacity: loading ? 1 : 0 }} className="loading-border" /> */}
        {Component ? <Component components={{ CH }} /> : null}
      </div>
    </>
  );
};

const logError = (error: Error, info: ErrorInfo) => {
  console.log("error boundary:", error, info);
};

const MDX: FC<{ mdx: string; width: number }> = ({ mdx, width }) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logError}>
      <InnerPreview input={mdx} width={width} />
    </ErrorBoundary>
  );
};

export default MDX;
