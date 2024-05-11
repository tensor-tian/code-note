import "reactflow/dist/style.css";
import "./index.css";

// import App from "./App";
// import Home from "./component/home";
import { Provider } from "react-redux";
import React from "react";
import ReactDOM from "react-dom/client";
import TimeAgo from "javascript-time-ago";
import TreeGraph from "./component/tree-graph";
import reportWebVitals from "./reportWebVitals";
import { store } from "./service/store";
import zh from "javascript-time-ago/locale/zh";

// import { HashRouter, Route, Routes } from "react-router-dom";

TimeAgo.addDefaultLocale(zh);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      {/* <ConfigProvider
        theme={{
          algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
        }}
      > */}
      <TreeGraph />
      {/* <HashRouter>
          <Routes>
            <Route path="*" element={<Home />} />
          </Routes>
        </HashRouter> */}
      {/* </ConfigProvider> */}
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
