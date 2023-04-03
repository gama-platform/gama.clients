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

  const { 
    codeFontSize, 
    setcodeFontSize
} = props;

  const [_id] = useState(props.id);   

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
    props.updateParam(   formValues );
    // this.setState({ param: formValues }, () => {
    //   this.grid.updateParam(this.state.param);
    //   this.saveWToLS("Widget" + this.id, this.state);
    //   // this.getWFromLS("Widget" + this.id);
    // });
  }
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
                    <td  width="50%" style={{paddingLeft:'10px'}}>
                      <InputSlider codeFontSize={codeFontSize} setcodeFontSize={setcodeFontSize} /></td>

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

      <BaseMap _id={_id} gama={props.gama} codeFontSize={codeFontSize} />
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
