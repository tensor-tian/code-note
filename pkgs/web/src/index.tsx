import "reactflow/dist/style.css";
import "./index.css";

import Graph from "./component/graph";
import React from "react";
import ReactDOM from "react-dom/client";
import TimeAgo from "javascript-time-ago";
import reportWebVitals from "./reportWebVitals";
import zh from "javascript-time-ago/locale/zh";

TimeAgo.addDefaultLocale(zh);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Graph />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
