import React from 'react'
import Creatable from 'react-select/creatable';
import { Card, Button, CardTitle, Spinner } from "reactstrap";

const options_server = [];
const options_model = [];

if (process.env.REACT_APP_ENABLE_LOCALHOST_GAMA) {
  const url = (process.env.REACT_APP_USE_SECURE_WEBSOCKET ? 'wss' : 'ws') + '://localhost:' + process.env.REACT_APP_LOCALHOST_GAMA_PORT;
  options_server.push({ value: url, label: 'Local GAMA' });

  options_model.push({ value: process.env.REACT_APP_LOCALHOST_COMOKIT_GIT_WORKSPACE + '/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures', label: '[LOCAL] MESO - Closures' });
  options_model.push({ value: process.env.REACT_APP_LOCALHOST_COMOKIT_GIT_WORKSPACE + '/Macro/Models/Experiments/No containment.gaml@No Containment', label: '[LOCAL] MACRO - No Containment' });
}

if (process.env.REACT_APP_ENABLE_REMOTE_GAMA) {
  const url = (process.env.REACT_APP_USE_SECURE_WEBSOCKET ? 'wss' : 'ws') + '://' + process.env.REACT_APP_REMOTE_GAMA_IP + ':' + process.env.REACT_APP_REMOTE_GAMA_PORT;
  options_server.push({ value: url, label: 'Remote GAMA' });

  options_model.push({ value: process.env.REACT_APP_REMOTE_COMOKIT_GIT_WORKSPACE + '/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures', label: '[REMOTE] MESO - Closures' });
  options_model.push({ value: process.env.REACT_APP_REMOTE_COMOKIT_GIT_WORKSPACE + '/Macro/Models/Experiments/No containment.gaml@No Containment', label: '[REMOTE] MACRO - No Containment' });
}

//  { value: 'C:/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 07.gaml@road_traffic', label: 'Road Traffic 07.gaml - road_traffic' }


const default_Experiment_state = {
  data: [],
  loading: false,
  title: "",
  param: [],

  // url: "ws://51.255.46.42:6001",
  // model_path: "/var/www/github/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml",
  url: "ws://51.255.46.42:6001",
  // model_path:"C:/git/PROJECT/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml",
  // exp_name: "Closures",
  model_path: '/var/www/github/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures',
  loaded: false,
  connected: false,
  waiting: false,
  expressions: [{
    label: "",
    expr: "",
    displayColorPicker: false,
    color: {
      r: '241',
      g: '112',
      b: '19',
      a: '1',
    }
  }]
};
class Experiment extends React.Component {
  // static id;
  constructor(param) {
    super();
    // if (typeof Experiment.id === 'undefined') {
    //   Experiment.id = 0;
    // } else {
    //   Experiment.id += 1;
    // }
    // this.id = "m" + Experiment.id;
    this._id = param.id;
    this.id = "m" + param.id;
    this.state = this.getCfgFromLS("Experiment" + this.id) || default_Experiment_state;
    this.grid = param.grid;
    this.gama = React.createRef();
    this.mySelRef = React.createRef();

    this.fetchFile = this.fetchFile.bind(this);
    this.handleChangeServer = this.handleChangeServer.bind(this);
    this.handleChangeModel = this.handleChangeModel.bind(this);
    this.handleChangeM1 = this.handleChangeM1.bind(this);
    this.handleChangeM2 = this.handleChangeM2.bind(this);
    this.handleChangeM3 = this.handleChangeM3.bind(this);
    this.handleChangeE = this.handleChangeE.bind(this);
    this.tryAutoStep = this.tryAutoStep.bind(this);
    this.tryPlay = this.tryPlay.bind(this);
    this.tryPause = this.tryPause.bind(this);
    this.tryStep = this.tryStep.bind(this);
    this.tryReload = this.tryReload.bind(this);
    this.tryClose = this.tryClose.bind(this);
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
    this.fetchFile();

    // Let's call the passed variable from parent if it's a function
    if (this.props.triggerChildFunc && {}.toString.call(this.props.triggerChildFunc) === '[object Function]') {
      this.props.triggerChildFunc();
    }
  }
  onParentTrigger2() {
    this.setState(
      this.getCfgFromLS("Experiment" + this.id)
    )

    // Let's call the passed variable from parent if it's a function
    if (this.props.triggerChildFunc2 && {}.toString.call(this.props.triggerChildFunc2) === '[object Function]') {
      this.props.triggerChildFunc2();
    }
  }
  componentDidMount(props) {
    this.setState((prevState) => ({
      connected: false,
      loaded: false
    }));
  }

  waiting(b) {
    this.setState((prevState) => ({
      waiting: b
    }));
  }
  checkConnect(b) {
    this.setState((prevState) => ({
      connected: b
    }));
  }


  handleChangeServer(e) {
    console.log(e);
    this.setState({
      url: e.value
    }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }


  handleChangeModel(e) {
    console.log(e);
    this.setState({
      model_path: e.value
    }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }

  handleChangeM1(i, e) {
    let formValues = this.state.mapbox;
    formValues[i].attributes = e.target.value;
    this.setState({ formValues }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }

  handleChangeM2(i, e) {
    let formValues = this.state.mapbox;
    formValues[i].style = e.target.value;
    this.setState({ formValues }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }

  handleChangeM3(i, e) {
    let formValues = this.state.mapbox;
    formValues[i].type = e.target.value;
    this.setState({ formValues }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }

  handleChangeL(i, e) {
    let formValues = this.state.expressions;
    formValues[i].label = e.target.value;
    this.setState({ formValues }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }
  handleChangeE(i, e) {
    let formValues = this.state.expressions;
    // console.log(i+" "+formValues);
    formValues[i][e.target.name] = e.target.value;
    this.setState({ formValues }, () => {
      this.saveCfgToLS("Experiment" + this.id, this.state);
      // this.getCfgFromLS("Experiment" + this.id);
    });
  }


  fetchFile() {
    if (this.grid.state && (this._id !== this.grid.state.id_param)) {
      this.setState((prevState) => ({
        data: [0, 1],
        loading: false
      }));
    }

  }

  render() {

    const ExperimentHeader = (
      <table>
        <tbody>

          <tr>
            <td width="100%"><div className="dragHandle">
            </div></td>
            {/* <td> <Button
              className="closeBtn"
              color="info"
              size="sm"
              onClick={() => this.toExperiment()}
              disabled={false && this.grid.state.waiting}
            >⚙</Button></td> */}
            <td> <Button
              className="closeBtn"
              color="danger"
              size="sm"
              onClick={() => this.grid.removeExperiment(this._id, true)}
            >x</Button></td></tr>
        </tbody>
      </table>);


    return (
      <>
        <div className="widgetHeader">
          {(this.grid.state && (this.grid.state.editing)) && ExperimentHeader}
        </div>

        <div
          style={{
            height: "300px",
            width: "100%"
          }}
        >
          <Card body><CardTitle width={'100%'}>
          </CardTitle>
            <form>


              <table width={'100%'}><tbody>


                <tr><td width={20} align='left'>Server:</td>
                  <td>

                    <Creatable options={options_server}

                      defaultInputValue={(options_server.find(obj => obj.value === this.state.url)) ? (options_server.find(obj => obj.value === this.state.url)).label : this.state.url}
                      onChange={this.handleChangeServer} />
                  </td>
                </tr>

                <tr><td colSpan={2}>
                  <div>
                    <table><tbody><tr width="100%">
                      <td><Button color="primary" style={{ width: "80px" }} size="sm" onClick={this.tryConnect}>Connect</Button></td>
                    </tr></tbody></table>
                  </div>
                </td></tr>

                <tr><td align='left'>Model:</td>
                  <td>

                    <Creatable options={options_model}
                      ref={ref => {
                        this.mySelRef = ref;
                      }}
                      defaultInputValue={(options_model.find(obj => obj.value === this.state.model_path)) ? (options_model.find(obj => obj.value === this.state.model_path)).label : this.state.model_path}
                      onChange={this.handleChangeModel} />
                  </td></tr>


                <tr><td colSpan={2}>
                  <div><table><tbody><tr width="100%">
                    {this.state.connected &&
                      <td><Button color="primary" style={{ width: "80px" }} size="sm" onClick={this.tryLaunch}>Launch</Button></td>
                    }
                  </tr></tbody></table></div>
                </td></tr>

                <tr><td colSpan={2}><div>
                  <table><tbody><tr width="100%">
                    {/* {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryAutoStep}>↹</Button> </td>} */}

                    {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryPlay}>▷</Button> </td>}

                    {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryPause}>❚❚</Button> </td>}

                    {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryStep}>⏯</Button> </td>}

                    {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryReload}>↻</Button> </td>}

                    {this.state.loaded && <td><Button color="primary" size="sm" onClick={this.tryClose}>✕</Button> </td>}
                  </tr></tbody></table></div></td>
                </tr>




                <tr><td colSpan={2} align="left">
                  {
                    (this.state.waiting) &&
                    <Button variant="primary" disabled>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="visually-hidden"> Loading...</span>
                    </Button>
                  }
                </td></tr>


              </tbody></table>

            </form>
          </Card>
        </div></>
    );

    // if (this.props.updateMethod) {
    //   this.Method();
    // }
    // return <><div className="ExperimentHeader">
    //   {(this.grid.state && (this.grid.state.editing)) && ExperimentHeader}
    // </div><SingleCharts props={this.state}></SingleCharts></>;
  }



  tryAutoStep() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 

      this.gama.current.queue.length = 0;
      this.gama.current.autoStep(() => { console.log("autoStep") });
      // this.gama.current.step(console.log("step"));
      // this.gama.current.play(console.log("play"));
    }
    // window.$gama.doConnect();
  }

  tryPlay() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 

      this.gama.current.queue.length = 0;
      // this.gama.current.autoStep(console.log("autoStep"));
      // this.gama.current.step(console.log("step"));
      this.gama.current.play(() => { console.log("play") });
    }
    // window.$gama.doConnect();
  }

  tryStep() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      this.gama.current.queue.length = 0;
      this.waiting(true);
      this.gama.current.step(() => {
        console.log("step");
        this.waiting(false);
      });
    }
    // window.$gama.doConnect();
  }
  tryPause() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      this.gama.current.queue.length = 0;
      this.gama.current.pause();
    }
    // window.$gama.doConnect();
  }
  tryReload() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      this.gama.current.queue.length = 0;
      var pp = [];
      this.props.grid.state.param_str_new.forEach((value, key, map) => {
        var v = value['value'];
        var t = "string";
        if (!isNaN(v)) {
          t = "float";
          if (v.indexOf('.') === -1) { t = "int"; }
        }
        pp.push({ "name": "" + value['key'], "value": v, "type": t });
      });

      this.gama.current.setParameters(pp);
      this.waiting(true);
      this.gama.current.reload(() => {
        console.log("reloaded");
        this.waiting(false);
      });
    }
    // window.$gama.doConnect();
  }
  tryClose() {
    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!== 
      this.gama.current.queue.length = 0;
      this.gama.current.pause(() => {
        console.log("disconnected");
        this.setState((prevState) => ({
          loaded: false
        }));
        this.gama.current.wSocket = null;
        this.checkConnect(false);
        this.props.grid.onShowClick(null);
      });
      // this.gama.current.reload(() => { console.log("reloaded"); });
    }
    // window.$gama.doConnect();
  }
  getCfgFromLS(key) {
    let ls = {};
    if (global.localStorage) {
      try {
        ls = JSON.parse(global.localStorage.getItem("rdv_Experiment" + key)) || {};
        if (ls[key]) {
          ls[key].expressions.map((element, index) => ({}));
        }
        // console.log(ls);
      } catch (e) {
        console.log(e + " " + key + " " + ls[key]);
        return default_Experiment_state;
      }
    }
    return ls[key];
  }

  saveCfgToLS(key, value) {
    if (global.localStorage) {
      global.localStorage.setItem(
        "rdv_Experiment" + key,
        JSON.stringify({
          [key]: value
        })
      );
    }
  }
}

export default Experiment;
