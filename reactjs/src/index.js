import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
// import registerServiceWorker from "./registerServiceWorker";
window.$gama = "";
 
// process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const rootElement = document.getElementById("root");
ReactDOM.render(
  <App />,
  rootElement
);


// registerServiceWorker();
