import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { connectWebSocket } from "./lib/ws";

// Initialize WebSocket early so the app can receive real-time updates
try {
	connectWebSocket();
} catch (e) {
	console.warn('WebSocket initialization failed', e);
}

createRoot(document.getElementById("root")!).render(<App />);
