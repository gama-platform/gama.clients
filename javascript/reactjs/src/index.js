import React from "react";
import { createRoot } from 'react-dom/client'
import App from "./App";
// import registerServiceWorker from "./registerServiceWorker";
window.$gama = "";
 
// process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; 
createRoot(document.getElementById('root')).render(
  <App />)


// registerServiceWorker();
