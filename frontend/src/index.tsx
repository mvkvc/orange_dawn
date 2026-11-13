import "./index.css";
import { mountApp } from "./app.dom";
const root = document.getElementById("app");
if (!root) throw new Error("Missing app root");
const dispose = mountApp(root);
import.meta.hot?.dispose(dispose);
