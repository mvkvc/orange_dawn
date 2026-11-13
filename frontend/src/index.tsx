import "./index.css";
import { mountAuth } from "./auth-view";

const disposeAuth = mountAuth();
import.meta.hot?.dispose(disposeAuth);
