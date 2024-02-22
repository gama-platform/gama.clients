import React, { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "./Widget";

const ResponsiveGridLayout = WidthProvider(Responsive);
const default_Layout = {
  widgets: [],
  editing: true,
  widgetSequence: 0,
  id_param: -1,
  waiting: true,
  param_str: [],
  param_str_new: [],
  layouts: {}
};

function Grid(props) {
  // class Grid extends React.Component {
  //   constructor(param) {
  //     super(param);
  //     this.props.gama.current.setGrid(this);
  //     this.state = default_Layout;     
  //     this.addParam = this.addParam.bind(this);
  //     this.remParam = this.remParam.bind(this);
  //     this.addWidget = this.addWidget.bind(this);
  //     this.removeWidget = this.removeWidget.bind(this);
  //     this.toggleEdit = this.toggleEdit.bind(this);
  //     this.waiting = this.waiting.bind(this);
  //     this.onShowClick = this.onShowClick.bind(this);
  //   }
  const [state, setState] = useState(default_Layout);
  // const [widgets, setWidgets] = useState([]);
  // const [_layouts, setLayouts] = useState({});
  // const [widgetSequence, setwidgetSequence] = useState(0);
  // const [id_param, setid_param] = useState(-1);
  // const [param_str, setparam_str] = useState([]);
  // const [param_str_new, setparam_str_new] = useState([]);


  // const onShowClick = (c) => {
  //   this.setState({ triggerFunc: () => c })
  // };

  // waiting(b) {
  //   this.setState((prevState) => ({
  //     waiting: b
  //   }));
  // }

  // componentDidMount(props) {
  //   if (this.state.id_param > 0) {
  //   }
  // }

  const remParam = () => {
    // setWidgets([]);
    // setid_param(-1);  
    // setState({
    //   widgets: [],
    //   id_param: -1,
    //   //do not decrement sequence, since each new widget must
    //   //have unique value
    //   widgetSequence: state.widgetSequence
    // });

    setState({
      widgets: [],
      id_param: -1,
      //do not decrement sequence, since each new widget must
      //have unique value
      widgetSequence: state.widgetSequence
    });
    state.widgets=[];
    // this.setState((prevState) => ({
    //   widgets: [],
    //   id_param: -1,
    //   //do not decrement sequence, since each new widget must
    //   //have unique value
    //   widgetSequence: prevState.widgetSequence
    // }));

  }
  const addParam = (ee) => {

    // console.log(JSON.parse(ee).content);
    ee = JSON.parse(ee).content.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
    var eee = ee.split(", ");
    // var t = "";
    var parameters = [];
    eee.forEach((e1) => {
      var e2 = e1.split("::");
      // console.log(e2[0]);
      // console.log(e2[1]);
      if (!("" + e2[1]).startsWith("msi.gama.util.file")) {
        var et0 = e2[0];
        var et1 = e2[1];
        var obj = {};
        obj["key"] = (" " + et0).trim();
        obj["value"] = et1;
        parameters.push(obj);
        // t += '<tr><td class="tdparam" width="150px">' + e2[0] + '</td><td  width="200px"> <input type="text" id="param_' + e2[0] + '" value="' + e2[1] + '">';
        // t += '</td><td><input type="checkbox" value="1" id="use_param_' + e2[0] + '" /></td></tr>';
      }
    });
    // t += '<tr><td> End Condition:</td><td> <input type="text" id="param_end_condition" value="cycle>1000"></td><td><input type="checkbox" value="1" id="use_param_end_condition" /></td></tr>';
    // setparam_str(parameters);
    // setparam_str_new(parameters);
    setState({
      widgets: [{ id: state.widgetSequence + 1 }, { id: state.widgetSequence + 2 }],
      widgetSequence: state.widgetSequence + 2,
      id_param: state.widgetSequence + 2,
      //   widgetSequence: prevState.widgetSequence + 1
      param_str: parameters,
      param_str_new: parameters,
    });
    // if (!this.state.id_param || this.state.id_param < 0) {
    // console.log("addParam " + this.state.id_param);
    // this.setState((prevState) => ({
    //   widgets: [...prevState.widgets, { id: prevState.widgetSequence + 1 }],
    //   id_param: prevState.widgetSequence + 1,
    //   widgetSequence: prevState.widgetSequence + 1
    // }));
    // setwidgetSequence(widgetSequence+2);
    // setWidgets([...widgets, { id: widgetSequence-1 }, { id: widgetSequence }]);
    // setid_param(widgetSequence);
    // }
  }

  const updateParam = (ee) => {
  // setparam_str_new(ee);
  setState( {
    widgets: state.widgets,
    widgetSequence: state.widgetSequence,
    id_param: state.widgetSequence,
    //   widgetSequence: prevState.widgetSequence + 1
    param_str: ee,
    param_str_new: state.param_str_new,
  });
  // saveToLS("Layout", this.state);
  }

  // const toggleEdit = () => {
  //   this.setState((prevState) => ({
  //     editing: !this.state.editing
  //   }));
  // }


  // const addWidget = () => {
  //   // this.setState((prevState) => ({
  //   //   widgets: [...prevState.widgets, { id: prevState.widgetSequence + 1, type: 'geojson' }],
  //   //   widgetSequence: prevState.widgetSequence + 1
  //   // }));
  //   // console.log("add " + widgetSequence);
  //   // setwidgetSequence(widgetSequence + 1);
  //   // console.log("add " + widgetSequence);
  //   // setWidgets([...widgets, { id: widgetSequence, type: 'geojson' }]);
  //   setState({
  //     widgets: [...state.widgets, { id: state.widgetSequence + 1 }],
  //     widgetSequence: state.widgetSequence + 1, 
  //   });
  // }

  // const removeWidget = (id, conf) => {
  //   if (conf) {
  //     if (window.confirm('Are you sure to remove?')) {
  //       // this.setState((prevState) => ({
  //       //   widgets: prevState.widgets.filter((item) => item.id !== id),
  //       //   id_param: id === prevState.id_param ? -1 : prevState.id_param,
  //       //   //do not decrement sequence, since each new widget must
  //       //   //have unique value
  //       //   widgetSequence: prevState.widgetSequence
  //       // }));
  //     }
  //   } else {
  //     setState( {
  //         widgets: state.widgets.filter((item) => item.id !== id),
  //         id_param: id === state.id_param ? -1 : state.id_param,
  //         //do not decrement sequence, since each new widget must
  //         //have unique value
  //         widgetSequence: state.widgetSequence
  //       });
  //     // setWidgets(widgets.filter((item) => item.id !== id));
  //     // setid_param(id === id_param ? -1 : id_param);

  //     // this.setState((prevState) => ({
  //     //   widgets: prevState.widgets.filter((item) => item.id !== id),
  //     //   id_param: id === prevState.id_param ? -1 : prevState.id_param,
  //     //   //do not decrement sequence, since each new widget must
  //     //   //have unique value
  //     //   widgetSequence: prevState.widgetSequence
  //     // }));
  //   }
  // }

  const onLayoutChange = (layout, layouts) => {
    window.dispatchEvent(new Event("resize"));
    // setLayouts(layouts);
    // this.setState({
    //   layouts: layouts
    // });
    // saveToLS("Layout", this.state);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const launchModelMethod = ((ee) => {

    // console.log(state);
    remParam();
    // addWidget();
    addParam(ee);
    // console.log(state);
  });
  const [codeFontSize, setcodeFontSize] = useState(1);

  React.useEffect(() => { 
    props.editor_grid_link_ref.current = launchModelMethod
  }, [launchModelMethod, props.editor_grid_link_ref]);


  const config = {
    x: 0,
    y: 0,
    w: 12,
    h: 3,
    maxH: 10,
    maxW: 16
  };
  const layouts = state.widgets.map((item) => (
    <div className="widget" key={item.id} data-grid={config}>
      <div className="mscroll" style={{ width: "100%", height: "100%" }}>
        <Widget  id={item.id}
        gama={props.gama} id_param={state.id_param} 
        codeFontSize={codeFontSize} 
        setcodeFontSize={setcodeFontSize}
        param={state.param_str} 
        updateParam={updateParam}
        param_str_new={state.param_str_new}></Widget>
        {/* //triggerChildFunc={triggerFunc} triggerChildFunc2={triggerFunc2}  grid={this} id={item.id} type={item.type}*/}
      </div>
    </div>
  ));

  return (
    <><div>
      {/* <div className="toolBar"> */}
      {/* <Button color="primary" size="sm" onClick={this.exportPdf}>
      Export to PDF
    </Button> */}
      {/* </div> */}
      {/* <br /> */}
      <ResponsiveGridLayout
        className="layout"
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 240 }}
        cols={{ lg: 16, md: 16, sm: 8, xs: 4, xxs: 2 }}
        rowHeight={185}
        draggableHandle={".dragHandle"}
        layouts={state._layouts}
        onLayoutChange={(layout, layouts) => onLayoutChange(layout, layouts)}
      >
        {/* {layoutsExperiment} */}
        {layouts}
      </ResponsiveGridLayout>
    </div></>
  );
}



export default Grid;
