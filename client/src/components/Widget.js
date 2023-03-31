import React, { useState } from 'react'
import { Input, Card, Button, CardTitle } from "reactstrap";
import BaseMap from "./BaseMap";

import InputSlider from '../components/InputSlider/InputSlider'
// const default_Widget_state = {
//   data: [],
//   loading: false,
//   title: "",
//   chartType: "single",
//   param: [],

// };

const Widget = (props) => {
  // class Widget extends React.Component {
  //   // static id;
  //   constructor(param) {
  //     super();
  //     // if (typeof Widget.id === 'undefined') {
  //     //   Widget.id = 0;
  //     // } else {
  //     //   Widget.id += 1;
  //     // }
  //     // this.id = "m" + Widget.id;
  //     this._id = param.id;
  //     this.id = "m" + param.id;
  //     this.state = default_Widget_state;
  //     this.grid = param.grid;
  //     this.type = param.type;
  //     this.state.chartType = param.type;

  //     this.fetchFile = this.fetchFile.bind(this);
  //     this.tryPlay = this.tryPlay.bind(this);
  //     this.tryPause = this.tryPause.bind(this);
  //     this.tryStep = this.tryStep.bind(this);
  //     this.tryReload = this.tryReload.bind(this);
  //     this.tryClose = this.tryClose.bind(this);
  //   }

  const [_id] = useState(props.id);
  // const [param, setParam] = useState([]);

  // const componentDidUpdate = (prevProps) => {
  //   if (this.props.triggerChildFunc !== prevProps.triggerChildFunc) {
  //     this.onParentTrigger();
  //   }
  //   if (this.props.triggerChildFunc2 !== prevProps.triggerChildFunc2) {
  //     this.onParentTrigger2();
  //   }
  //   // if (this._id === this.grid.state.id_param) {
  //   this.setState({
  //     param: this.grid.state.param_str,
  //     chartType: this.type
  //   }, () => {

  //     // this.setState(this.getWFromLS("Widget" + this.id))
  //     // this.getWFromLS("Widget" + this.id);
  //   });
  // }

  // const onParentTrigger = () => {
  //   this.toEdit(0);

  //   // Let's call the passed variable from parent if it's a function
  //   if (this.props.triggerChildFunc && {}.toString.call(this.props.triggerChildFunc) === '[object Function]') {
  //     this.props.triggerChildFunc();
  //   }
  // }
  // const onParentTrigger2 = () => {
  //   this.setState(

  //   )

  //   // Let's call the passed variable from parent if it's a function
  //   if (this.props.triggerChildFunc2 && {}.toString.call(this.props.triggerChildFunc2) === '[object Function]') {
  //     this.props.triggerChildFunc2();
  //   }
  // }
  // const fetchFile = () => {
  //   // this.setState((prevState) => ({
  //   //   data: prevState.data,
  //   //   loading: true
  //   // }));
  //   // const url = this.state.url;
  //   // const chartType = this.state.chartType;

  //   // console.log(url);s
  //   if (this.grid.state && (this._id !== this.grid.state.id_param)) {
  //     this.setState((prevState) => ({
  //       data: [0, 1],
  //       loading: false
  //     }));
  //   }

  // }

  const tryPlay = () => {
    // console.log(props.gama.current);
    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 

      props.gama.current.queue.length = 0;
      // this.gama.current.autoStep(console.log("autoStep"));
      // this.gama.current.step(console.log("step"));
      props.gama.current.play(() => { console.log("play") });
    }
    // window.$gama.doConnect();
  }

  const tryStep = () => {
    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      props.gama.current.queue.length = 0;
      props.gama.current.step(() => {
        console.log("step");
      });
    }
    // window.$gama.doConnect();
  }
  const tryPause = () => {
    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      props.gama.current.queue.length = 0;
      props.gama.current.pause();
    }
    // window.$gama.doConnect();
  }
  const tryReload = () => {
    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      props.gama.current.queue.length = 0;
      var pp = [];
      props.param_str_new.forEach((value, key, map) => {
        var v = value['value'];
        var t = "string";
        if (!isNaN(v)) {
          t = "float";
          if (v.indexOf('.') === -1) { t = "int"; }
        }
        pp.push({ "name": "" + value['key'], "value": v, "type": t });
      });

      props.gama.current.setParameters(pp);
      props.gama.current.reload(() => {
        console.log("reloaded");
      });
    }
    // window.$gama.doConnect();
  }
  const tryClose = () => {
    if (props.gama.current && props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      props.gama.current.stop(() => {
        console.log("exp closed");
      });
    }
  }

  const handleChangeCBBOX = (i, e) => {
    let formValues = props.param;
    formValues[i]["value"] = e.target.value;
    // console.log(formValues[i]);
    // this.setState({ param: formValues }, () => {
    //   this.grid.updateParam(this.state.param);
    //   this.saveWToLS("Widget" + this.id, this.state);
    //   // this.getWFromLS("Widget" + this.id);
    // });
  }
  const [codeFontSize, setcodeFontSize] = useState(1);
  const widgetHeader = (
    <table>
      <tbody>

        <tr>
          <td width="100%"><div className="dragHandle">[]
          </div></td>

        </tr>
      </tbody>
    </table>);
  if (props.param && (_id === props.id_param)) {

    const param_layouts = ((_id === props.id_param)) ? props.param.map((e, index) => (
      <tr key={e['key']} ><td width={50}>{e['key']}</td>
        <td> <Input type="text" name={"param_" + e['key']}
          value={e['value'] || ""} onChange={e => handleChangeCBBOX(index, e)}
        />
        </td>
        <td width={50}><Input type="checkbox" value={e['value']} name={e['key']} id={"use_param_" + e['key']}
        /></td></tr>



    )) : "";

    var divStyle = {
      display: "block",
      padding: "0px 0px",
      height: "101px"
    };
    return (
      <> <div className="widgetHeader">
        {widgetHeader}
      </div>
        <div
          style={{
            height: "300px",
            width: "100%"
          }}
        >
          <Card body><CardTitle>
            <div style={{ padding: 0 }}>Parameters</div>
          </CardTitle>

            <table width={'100%'}>
              <tbody>
                <tr><td colSpan={2}><div>
                  <table ><tbody><tr>
                    {<td><Button color="primary" size="sm" onClick={tryPlay}>▷</Button> </td>}

                    {<td><Button color="primary" size="sm" onClick={tryPause}>❚❚</Button> </td>}
                    <td  width="50%" style={{paddingLeft:'10px'}}><InputSlider codeFontSize={codeFontSize} setcodeFontSize={setcodeFontSize} /></td>

                    {<td><Button color="primary" size="sm" onClick={tryStep}>⏯</Button> </td>}

                    {<td><Button color="primary" size="sm" onClick={tryReload}>↻</Button> </td>}

                    {<td><Button color="primary" size="sm" onClick={tryClose}>✕</Button> </td>}
                    </tr></tbody></table></div>



                </td>
                </tr>
                {param_layouts}
              </tbody>
            </table>
          </Card>
        </div></>
    );
  } else {
    return (<><div className="widgetHeader">
      {widgetHeader}
    </div>

      <BaseMap _id={_id} gama={props.gama} />
    </>
    );
  }
  // if (this.props.updateMethod) {
  //   this.Method();
  // }




  // componentWillUnmount() {
  //   // this.tryClose();
  // }

}

export default Widget;
