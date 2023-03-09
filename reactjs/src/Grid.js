import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Experiment from "./Experiment";
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

class Grid extends React.Component {
  constructor(param) {
    super(param);
    this.props.gama.current.setGrid(this);
    this.state = default_Layout;     
    this.addParam = this.addParam.bind(this);
    this.remParam = this.remParam.bind(this);
    this.addWidget = this.addWidget.bind(this);
    this.removeWidget = this.removeWidget.bind(this);
    // this.addExperiment = this.addExperiment.bind(this);
    // this.removeExperiment = this.removeExperiment.bind(this);
    this.toggleEdit = this.toggleEdit.bind(this);
    this.waiting = this.waiting.bind(this);
    this.onShowClick = this.onShowClick.bind(this);
  }

  onShowClick(c) {
    // this.child.current.fetchFile();
    // this.refs.child.fetchFile();
    this.setState({ triggerFunc: () => c })

  };

  waiting(b) {
    this.setState((prevState) => ({
      waiting: b
    }));
  }

  componentDidMount(props) {
    if (this.state.id_param > 0) {
      // console.log("componentDidMount " + this.state.id_param);
      // this.removeWidget(this.state.id_param);
      // this.waiting(true);
    }
  }

  remParam() {
    // if (this.state.id_param > 0) {
    // console.log("remParam " + this.state.id_param);
      // this.removeWidget(this.state.id_param);
      // this.setState((prevState) => ({
      //   widgets: prevState.widgets.filter((item) => item.id !== this.state.id_param),
      //   id_param: this.state.id_param === prevState.id_param ? -1 : prevState.id_param,
      //   //do not decrement sequence, since each new widget must
      //   //have unique value
      //   widgetSequence: prevState.widgetSequence
      // }));
      
      this.setState((prevState) => ({
        widgets: [], 
        id_param: -1,
        //do not decrement sequence, since each new widget must
        //have unique value
        widgetSequence: prevState.widgetSequence
      }));
      
      // this.setState(default_Layout);
      // this.state.id_param = -1;
    // }
    // this.setState((prevState) => ({
    //   widgets: [],
    //   widgetSequence: 0,
    //   id_param: -1,
    // })); this.state.id_param = -1;
  }
  addParam(ee) {

    // console.log(JSON.parse(ee).content);
    ee = JSON.parse(ee).content.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
    var eee = ee.split(",");
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
    this.setState((prevState) => ({
      param_str: parameters,
      param_str_new: parameters
    }));
    // saveToLS("Layout", this.state);

    // if (!this.state.id_param || this.state.id_param < 0) {
      // console.log("addParam " + this.state.id_param);
      this.setState((prevState) => ({
        widgets: [...prevState.widgets, { id: prevState.widgetSequence + 1 }],
        id_param: prevState.widgetSequence + 1,
        widgetSequence: prevState.widgetSequence + 1
      }));
    // }
  }

  updateParam(ee) {
    this.setState((prevState) => ({
      param_str_new: ee
    }));
    // saveToLS("Layout", this.state);
  }

  toggleEdit() {
    this.setState((prevState) => ({
      editing: !this.state.editing
    }));
  }

  
  addWidget() {
    this.setState((prevState) => ({
      widgets: [...prevState.widgets, { id: prevState.widgetSequence + 1 ,type:'geojson'}],
      widgetSequence: prevState.widgetSequence + 1
    }));
  }

  // addExperiment() {
  //   this.setState((prevState) => ({
  //     exps: [...prevState.exps, { id: prevState.expSequence + 1 }],
  //     expSequence: prevState.expSequence + 1
  //   }));
  // }

  removeWidget(id, conf) {
    if (conf) {
      if (window.confirm('Are you sure to remove?')) {
        this.setState((prevState) => ({
          widgets: prevState.widgets.filter((item) => item.id !== id),
          id_param: id === prevState.id_param ? -1 : prevState.id_param,
          //do not decrement sequence, since each new widget must
          //have unique value
          widgetSequence: prevState.widgetSequence
        }));
      }
    } else {
      this.setState((prevState) => ({
        widgets: prevState.widgets.filter((item) => item.id !== id),
        id_param: id === prevState.id_param ? -1 : prevState.id_param,
        //do not decrement sequence, since each new widget must
        //have unique value
        widgetSequence: prevState.widgetSequence
      }));
    }
  }

  // removeExperiment(id, conf) {
  //   if (conf) {
  //     if (window.confirm('Are you sure to disconnect?')) {
  //       this.setState((prevState) => ({
  //         exps: prevState.exps.filter((item) => item.id !== id),
  //         expSequence: prevState.expSequence
  //       }));
  //     }
  //   } else { 
  //     this.setState((prevState) => ({
  //       exps: prevState.exps.filter((item) => item.id !== id), 
  //       expSequence: prevState.expSequence
  //     }));
  //   }
  // }

  onLayoutChange(layout, layouts) {
    window.dispatchEvent(new Event("resize"));
    this.setState({
      layouts: layouts
    });
    // saveToLS("Layout", this.state);
  }

  render() {
    const config = {
      x: 0,
      y: 0,
      w: 12,
      h: 3,
      maxH: 10,
      maxW: 16
    };
    const layouts = this.state.widgets.map((item) => (
      <div className="widget" key={item.id} data-grid={config}>
        <div className="mscroll" style={{ width: "100%", height: "100%" }}>
          <Widget triggerChildFunc={this.state.triggerFunc} triggerChildFunc2={this.state.triggerFunc2} grid={this} id={item.id} type={item.type}></Widget>
        </div>
      </div>
    ));

    // const layoutsExperiment = this.state.exps.map((item) => (
    //   <div className="widget" key={"c"+item.id} data-grid={config}>
    //     <div className="mscroll" style={{ width: "100%", height: "100%" }}>
    //       <Experiment grid={this} id={item.id}></Experiment>
    //     </div>
    //   </div>
    // ));

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
          layouts={this.state.layouts}
          onLayoutChange={(layout, layouts) => this.onLayoutChange(layout, layouts)}
        >
          {/* {layoutsExperiment} */}
          {layouts}
        </ResponsiveGridLayout>
      </div></>
    );
  }
}



export default Grid;
