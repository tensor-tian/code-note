import mdx from "@next/mdx";
import rehypeSlug from "rehype-slug";
import { remarkCodeHike } from "@code-hike-local/mdx";
import remarkMermaid from "remark-mermaidjs";
import remarkToc from "remark-toc";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {
    rehypePlugins: [rehypeSlug],
    remarkPlugins: [
      [
        remarkCodeHike,
        {
          theme: "material-darker", // https://codehike.org/docs/themes
          lineNumbers: true, // https://codehike.org/docs/configuration
          showCopyButton: true,
          staticMediaQuery: "max-width: 1000px",
          autoImport: true,
          autoLink: true,
          skipLanguages: ["mermaid"],
        },
      ],
      remarkToc,
      // @ts-ignore
      remarkMermaid,
    ],
  },
});

export default withMDX({
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
});
