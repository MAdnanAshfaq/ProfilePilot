import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize the app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
