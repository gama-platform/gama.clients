import React, { useRef } from "react";
import "./assets/rgl.css";
import "./assets/styles.css";

import GAMA from "./controller/GAMA";
import LoginButton from "./component/LoginButton";

import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons  


class App extends React.Component {

  constructor(props) {
    super(props);
    this.gama = React.createRef();
    this.login = React.createRef();
  }

  render() {

    return (

      <><GAMA ref={this.gama}></GAMA>
      <LoginButton ref={this.login} gama={this.gama} />
       </>
    );
  }
}
export default App;
// export default function App() {
//   return (
//     <div>
//       <div className="sidebar">
//         Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
//       </div>
//       <div ref={mapContainer} className="map-container" />
//     </div>
//   );
// }