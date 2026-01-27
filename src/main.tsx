import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeContextProvider } from "./lib/theme-context";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/themes/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary
      level="app"
      onError={(error, errorInfo) => {
        console.error('[App Error]', error, errorInfo);
      }}
    >
      <ThemeContextProvider>
        <App />
      </ThemeContextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
