import React from 'react'
import reactCSS from 'reactcss'
import { SketchPicker } from 'react-color'
import Charts from "./component/SeriesChart";
import AreaCharts from "./component/AreaChart";
import SingleCharts from "./component/SingleChart";
import { Input, Card, Button, CardTitle } from "reactstrap";
import BaseMap from "./component/BaseMap";
 
const default_Widget_state = {
  data: [],
  loading: false,
  title: "",
  chartType: "single",
  param: [],
 
};
class Widget extends React.Component {
  // static id;
  constructor(param) {
    super();
    // if (typeof Widget.id === 'undefined') {
    //   Widget.id = 0;
    // } else {
    //   Widget.id += 1;
    // }
    // this.id = "m" + Widget.id;
    this._id = param.id;
    this.id = "m" + param.id;
    this.state = default_Widget_state;
    this.grid = param.grid;
    this.type=param.type;
    this.state.chartType=param.type;
 
    this.fetchFile = this.fetchFile.bind(this); 
  }
  
  componentDidUpdate(prevProps) {
    if (this.props.triggerChildFunc !== prevProps.triggerChildFunc) {
      this.onParentTrigger();
    }
    if (this.props.triggerChildFunc2 !== prevProps.triggerChildFunc2) {
      this.onParentTrigger2();
    }
  }

  onParentTrigger() {
    this.toEdit(0);

    // Let's call the passed variable from parent if it's a function
    if (this.props.triggerChildFunc && {}.toString.call(this.props.triggerChildFunc) === '[object Function]') {
      this.props.triggerChildFunc();
    }
  }
  onParentTrigger2() {
    this.setState(
      this.getWFromLS("Widget" + this.id)
    )

    // Let's call the passed variable from parent if it's a function
    if (this.props.triggerChildFunc2 && {}.toString.call(this.props.triggerChildFunc2) === '[object Function]') {
      this.props.triggerChildFunc2();
    }
  }
  componentDidMount(props) {
    // this.saveWToLS("Widget" + this.id, this.state);
    // if (this._id === this.grid.state.id_param) {
    this.setState({ param: this.grid.state.param_str ,
      chartType: this.type}, () => {
      this.saveWToLS("Widget" + this.id, this.state);

      // this.setState(this.getWFromLS("Widget" + this.id))
      // this.getWFromLS("Widget" + this.id);
    }); 
  }

  fetchFile() {
    // this.setState((prevState) => ({
    //   data: prevState.data,
    //   loading: true
    // }));
    // const url = this.state.url;
    // const chartType = this.state.chartType;

    // console.log(url);s
    if (this.grid.state && (this._id !== this.grid.state.id_param)) {
      this.setState((prevState) => ({
        data: [0, 1],
        loading: false
      }));
    }

    // fetch(url)
    //   .then((res) => res.json())
    //   .then(
    //     (result) => {
    //       result.chart = { type: chartType };
    //       console.log(result);
    //       this.setState({
    //         data: result,
    //         loading: false
    //       });
    //     },
    //     (error) => {
    //       console.log(error);
    //       alert(error);
    //     }
    //   );
  }

  render() {
    // if (this.state.loading)
    //   return (
    //     <div style={{ height: "300px", lineHeight: "300px" }}>
    //       <Spinner color="secondary" />
    //     </div>
    //   );

    // console.log(this.state.expressions);
    // console.log(this.grid.state.param_str);
    const widgetHeader = (
      <table>
        <tbody>

          <tr>
            <td width="100%"><div className="dragHandle">
            </div></td>
            {/* <td> <Button
              className="closeBtn"
              color="info"
              size="sm"
              onClick={() => this.toEdit(this.state.data.length)}
              disabled={false && this.grid.state.waiting}
            >⚙</Button></td>
            <td> <Button
              className="closeBtn"
              color="danger"
              size="sm"
              onClick={() => this.grid.removeWidget(this._id, true)}
            >x</Button></td> */}
            </tr>
        </tbody>
      </table>);
    // if (this.state.data.length < 1) {
      if(this.grid.state && (this._id === this.grid.state.id_param)){
      // console.log(this._id);
      // console.log(this.grid.state.id_param); 

      const param_layouts = (this.grid.state && (this._id === this.grid.state.id_param)) ? this.state.param.map((e, index) => (
        <tr key={e['key']} ><td width={50}>{e['key']}</td>
          <td> <Input type="text" name={"param_" + e['key']}
            value={e['value'] || ""} onChange={e => this.handleChangeCBBOX(index, e)}
          />
          </td>
          <td width={50}><Input type="checkbox" value={e['value']} name={e['key']} id={"use_param_" + e['key']}
            onChange={(e) => this.handleFuel(e)} /></td></tr>



      )) : "";

      return (
        <><div className="widgetHeader">
          {(this.grid.state && (this.grid.state.editing)) && widgetHeader}
        </div>

          <div
            style={{
              height: "300px",
              width: "100%"
            }}
          >
            <Card body><CardTitle>
              {(this.grid.state && (this._id === this.grid.state.id_param)) && <div style={{ padding: 0 }}>Parameters</div>}
            </CardTitle>

              {(this.grid.state && (this._id === this.grid.state.id_param)) &&
                <table width={'100%'}>
                  <tbody>
                    <tr><td colSpan={2}><div>
                      <table><tbody><tr width="100%">
                        {/* {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryAutoStep}>↹</Button> </td>} */}

                        {<td><Button color="primary" size="sm" onClick={this.tryPlay}>▷</Button> </td>}

                        {<td><Button color="primary" size="sm" onClick={this.tryPause}>❚❚</Button> </td>}

                        {<td><Button color="primary" size="sm" onClick={this.tryStep}>⏯</Button> </td>}

                        {<td><Button color="primary" size="sm" onClick={this.tryReload}>↻</Button> </td>}

                        {<td><Button color="primary" size="sm" onClick={this.tryClose}>✕</Button> </td>}
                      </tr></tbody></table></div></td>
                    </tr>
                    {param_layouts}

                  </tbody>
                </table>}
            </Card>
          </div></>
      );
    }
    if (this.props.updateMethod) {
      this.Method();
    } 
    return (<><div className="widgetHeader">
      {(this.grid.state && (this.grid.state.editing)) && widgetHeader}
    </div><BaseMap parent={this} props={this.state} /></>
    )
      ;
  }



  // getWFromLS(key) {
  //   let ls = {};
  //   if (global.localStorage) {
  //     try {
  //       ls = JSON.parse(global.localStorage.getItem("rdv_widget" + key)) || {};
  //       if (ls[key]) {
  //         ls[key].mapbox.map((element, index) => (<></>
  //         ));
  //         ls[key].expressions.map((element, index) => (<></>
  //         ));
  //       }
  //       // console.log(ls);
  //     } catch (e) {
  //       console.log(e + " " + key + " " + ls[key]);
  //       return default_Widget_state;
  //     }
  //   }
  //   return ls[key];
  // }

  saveWToLS(key, value) {
    // if (global.localStorage) {
    //   global.localStorage.setItem(
    //     "rdv_widget" + key,
    //     JSON.stringify({
    //       [key]: value
    //     })
    //   );
    // }
  }
}

export default Widget;
