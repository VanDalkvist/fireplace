import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./design-system/tokens.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
