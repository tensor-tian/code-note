import "@code-hike-local/mdx/styles";
import "./style.css";

import React from "react";

// custom style https://codehike.org/docs/styling

export default function MyApp({ Component, pageProps }) {
  return (
    <article className="app">
      <Component {...pageProps} />
    </article>
  );
}
