import React, { useRef } from "react";
import "./assets/rgl.css";
import "./assets/styles.css";
import { Container } from "reactstrap";
import Grid from "./Grid";
import OptionsBar from "./Options";
// import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
// import 'react-tabs/style/react-tabs.css';
import * as FlexLayout from "flexlayout-react";
import 'flexlayout-react/style/light.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';   // theme
import 'primereact/resources/primereact.css';                       // core css
import 'primeicons/primeicons.css';                                 // icons 

import { useFormik } from 'formik';
import { ListBox } from 'primereact/listbox';
import { ConfirmPopup } from 'primereact/confirmpopup'; // To use <ConfirmPopup> tag
import { confirmPopup } from 'primereact/confirmpopup'; // To use confirmPopup method


import { Toast } from 'primereact/toast';
import { models } from './data.js';


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
      "selected": 0,
      "location": "left",
      "children": [
        {
          "type": "tab",
          "id": "#24",
          "name": "Navigation",
          weight: 75,
          "component": "Navigation",
          "enableClose": false
        },
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
      "selected": -1,
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
    // weight: 100,
    children: [
      // {
      //   type: "tabset",
      //   weight: 75,
      //   children: [
      //     {
      //       type: "tab",
      //       name: "Modeling",
      //       component: "Modeling",
      //     }
      //   ]
      // },
      {
        type: "tabset",
        children: [
          {
            type: "tab",
            name: "Simulation",
            component: "Simulation",
            "enableClose": false
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
    if (component === "Simulation") {
      return <Container fluid={true}>

        <Grid ref={mygrid} ></Grid>

      </Container>;
    }
    if (component === "Navigation") {

      const toast = useRef(null);

      const show = (e) => {
        toast.current.show({ severity: 'success', summary: 'Experiment', detail: e });
      };

      const formik = useFormik({
        initialValues: {
          item: ''
        },
        validate: (data) => {
          let errors = {};

          if (!data.item) {
            errors.item = 'City is required.';
          }

          return errors;
        },
        onSubmit: (data) => {
          data.item && show(formik.values.item.name + " " + formik.values.item.code);
          formik.resetForm();
        }
      });

      const isFormFieldInvalid = (name) => !!(formik.touched[name] && formik.errors[name]);

      const getFormErrorMessage = (name) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik.errors[name]}</small> : <small className="p-error">&nbsp;</small>;
      };

      const accept = () => {
        toast.current.show({ severity: 'info', summary: 'Confirmed', detail: 'Experiment '+formik.values.item.code, life: 3000 });
      };

      const reject = () => {
        // toast.current.show({ severity: 'warn', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
      };

      const confirm1 = (event) => {
        confirmPopup({
          target: event.currentTarget,
          message: 'Are you sure you want to launch?',
          icon: 'pi pi-exclamation-triangle',
          accept,
          reject
        });
      };
      return (
        <form onSubmit={formik.handleSubmit} className="flex flex-column align-items-left">
          {/* <Button type="submit" label="Launch"  /> */}
          <Toast ref={toast} />
          <ConfirmPopup />
          <ListBox
            id="item"
            name="item"
            filter
            value={formik.values.item}
            options={models}
            optionLabel="name"
            placeholder="Select a Experiment"
            onChange={(e) => {
              formik.setFieldValue('item', e.value);
              // console.log(e);
              // show(e.value.code);
              // confirm1(e);
            }}
            onClick={(e) => {
              switch (e.detail) {
                case 1:
                  // console.log("click");
                  break;
                case 2:

                  console.log(mygrid); 
                  // formik.setFieldValue('item', e.value);
                  // console.log(e.target);
                  // console.log(formik.values.item);
                  // show(e.value.code);
                  // confirm1(e);
                  break;
                case 3:
                  // console.log("triple click");
                  break;
              }
            }}
            style={{ width: '100%', textAlign: "left" }}
          />
          {getFormErrorMessage('item')}
        </form>
      );
    }
    if (component === "Options") {
      return <OptionsBar grid={mygrid} />;
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