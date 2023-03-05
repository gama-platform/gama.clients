import React from 'react';
import "./assets/rgl.css";
import "./assets/styles.css";
import { Container } from "reactstrap";
import Grid from "./Grid";
import NavigationBar from "./Navbar";
// import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// import 'react-tabs/style/react-tabs.css';
import * as FlexLayout from "flexlayout-react";
import 'flexlayout-react/style/light.css';

// import { Tabs, TabLink, TabContent } from 'react-tabs-redux';
// const bstyle = {
//   margin: 0,
//   top: 'auto',
//   left: 2,
//   bottom: 2,
//   right: 'auto',
//   position: 'fixed',
//   zIndex:9999999
// };
var json = {
  global: { "tabEnableFloat": true },

  "borders": [
    {
      "type": "border",
      "location": "left",
      "children": [
        {
          "type": "tab",
          "id": "#24",
          "name": "Navigation",
          "component": "Navigation",
          "enableClose": false
        }
      ]
    },
    {
      "type": "border",
      "location": "right",
      "children": [
        {
          "type": "tab",
          "id": "#3",
          "name": "Options",
          "component": "Options",
          "config": {
            "id": "1"
          },
          "enableClose": false
        }
      ]
    },
    {
      "type": "border",
      "selected": 1,
      "location": "bottom",
      "children": [
        {
          "type": "tab",
          "id": "#2",
          "name": "Activity Blotter",
          "component": "grid",
          "config": {
            "id": "1"
          },
          "enableClose": false
        },
        {
          "type": "tab",
          "id": "#1",
          "name": "Execution Blotter",
          "component": "grid",
          "config": {
            "id": "1"
          },
          "enableClose": false
        }
      ]
    }
  ],
  layout: {
    type: "row",
    weight: 100,
    children: [ 
      {
        type: "tabset",
        weight: 75,
        children: [
          {
            type: "tab",
            name: "Simulation",
            component: "button",
          }
        ]
      }
    ]
  }
};
const mql = window.matchMedia(`(min-width: 800px)`);
class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      sidebarDocked: mql.matches,
      sidebarOpen: true,
      model: FlexLayout.Model.fromJson(json)
    };
    this.mediaQueryChanged = this.mediaQueryChanged.bind(this);
    this.onSetSidebarOpen = this.onSetSidebarOpen.bind(this);
  }


  factory(node) {
    var component = node.getComponent();
    if (component === "text") {
      return (<div className="panel">Panel {node.getName()}</div>);
    }
  }
  componentDidMount() {
    mql.addListener(this.mediaQueryChanged);
  }

  componentWillUnmount() {
    mql.removeListener(this.mediaQueryChanged);
  }

  onSetSidebarOpen(open) {
    this.setState({ sidebarOpen: open });
  }

  mediaQueryChanged() {
    this.setState({ sidebarDocked: mql.matches, sidebarOpen: false });
  }

  factory = (node) => {
    var component = node.getComponent();
    var mygrid = React.createRef();
    if (component === "button") {
      return <Container fluid={true}>

        <Grid ref={mygrid} ></Grid>

      </Container>;
    }

    if (component === "Options") {
      return <NavigationBar grid={mygrid} />
    }
  }
  render() {
    var mygrid = React.createRef();

    return (
      <div className="App">

        <FlexLayout.Layout
          model={this.state.model}
          factory={this.factory.bind(this)} />
      </div>
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