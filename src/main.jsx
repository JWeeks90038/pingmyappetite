import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthContextProvider } from "./components/AuthContext"; // <-- Import it!
import MobileDebugger from "./components/MobileDebugger";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthContextProvider>
    <MobileDebugger>
      <App />
    </MobileDebugger>
  </AuthContextProvider>
);