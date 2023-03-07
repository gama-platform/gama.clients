import React, { useState } from 'react'
import GAMA from "./controller/GAMA";
import { Fab, Action } from 'react-tiny-fab';
import 'react-tiny-fab/dist/styles.css';
import { Button } from 'reactstrap';
import { Dropdown } from 'primereact/dropdown';


const options_server = [{ value: "ws://51.255.46.42:6001", label: 'ovh' }];
const options_model = [{ value: "/Users/hqn88/git/gama", label: 'mym1' }]; 
const cities = [
  { name: 'New York', code: 'NY' },
  { name: 'Rome', code: 'RM' },
  { name: 'London', code: 'LDN' },
  { name: 'Istanbul', code: 'IST' },
  { name: 'Paris', code: 'PRS' }
];
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

const default_Nav_state = {
  // url: "ws://51.255.46.42:6001",
  // model_path: "/var/www/github/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures",
  url: "ws://localhost:6868",
  // model_path:"C:/git/PROJECT/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml",
  //C:/git/PROJECT/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures
  // exp_name: "Closures",

  connected: false,
  loading: false,
  waiting: false,
  model_path: 'C:/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml@road_traffic'
};

const components = [
  {
    position: {
      bottom: 0,
      left: 0,
    },
    event: 'hover',
    alwaysShowTitle: true,
    mainButtonStyles: {
      backgroundColor: 'dodgerblue', borderRadius: 8
    },
    actionButtonStyles: {
      backgroundColor: 'dodgerblue', borderRadius: 8,
      color: '#fff',
    },
  },
];

class OptionsBar extends React.Component {
  constructor(param) {
    super(param);
    this.mySelRef = React.createRef();
    this.id = "m" + param.id;
    this.state = this.getNFromLS("Nav") || default_Nav_state;
    this.gama = React.createRef();
    this.grid = param.grid; 
    this.fileUploadInput = React.createRef();

    this.checkConnect = this.checkConnect.bind(this);
    this.fetchFile = this.fetchFile.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
    this.handleChangeServer = this.handleChangeServer.bind(this);
    this.handleChangeModel = this.handleChangeModel.bind(this);
    this.tryAdd = this.tryAdd.bind(this);
    this.tryExperiment = this.tryExperiment.bind(this);
    this.tryEdit = this.tryEdit.bind(this);
    // this.trySave = this.trySave.bind(this);
    // this.tryLoad = this.tryLoad.bind(this);
    this.waiting = this.waiting.bind(this);
    this.tryConnect = this.tryConnect.bind(this);
    this.tryLaunch = this.tryLaunch.bind(this);
    this.tryGenParam = this.tryGenParam.bind(this);
  }

  componentDidMount(props) {
    this.setState((prevState) => ({
      connected: false,
      loaded: false
    }));
    // this.waiting(true);
  }

  waiting(b) {
    this.setState((prevState) => ({
      waiting: b
    }));
  }
 

  handleChangeServer(e) {
    // console.log(e);
    this.setState({
      url: e.value
    }, () => {
      this.saveNToLS("Nav", this.state);
      // this.getWFromLS("Widget" + this.id);
    });
  }


  handleChangeModel(e) {
    // console.log(e);
    this.setState({
      model_path: e.value
    }, () => {
      this.saveNToLS("Nav", this.state);
      // this.getWFromLS("Widget" + this.id);
    });
  }

  checkConnect() {
    this.setState((prevState) => ({
      connected: true
    }));
  }


  fetchFile() {
    this.setState((prevState) => ({
      loaded: true
    }));
  }

  onFileChange(evt) {
    // console.log(evt.target.files);

    let files = evt.target.files;
    if (!files.length) {
      alert('No file select');
      return;
    }
    let file = files[0];
    let reader = new FileReader();
    var _this = this;
    reader.onload = function (e) {
      _this.props.grid.current.reloadLayout(JSON.parse(e.target.result));
    };
    reader.readAsText(file);
  }

  render() {

    // const renderComponents = c =>
    // c.map(({ mainButtonStyles, actionButtonStyles, position, event, alwaysShowTitle }, i) => (
    const renderComponents = (<><div>
      <table><tbody>
        
      <tr><td> 
          <Dropdown value={this.state.url} options={options_server} optionLabel="label" onChange={this.handleChangeServer}
            editable placeholder="url" className="w-full md:w-14rem" />
         
          <Button color="primary" style={{ width: "80px" }} size="sm" onClick={this.tryConnect}>Connect</Button>

          <Dropdown value={this.state.model_path} options={options_model} optionLabel="label" onChange={this.handleChangeModel}
            editable placeholder="Root path" className="w-full md:w-14rem" />
        </td></tr>
      </tbody></table>





    </div></>);

    return <>
      <GAMA ref={this.gama} ></GAMA>
      {renderComponents}
      <input hidden ref={this.fileUploadInput} id="fileUpload" type="file" onChange={this.onFileChange} accept="text/plain" />
    </>

  }


  tryConnect() {
    var _this = this;
    if (!this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 
      this.waiting(true);

      this.gama.current.connect(this.state.url, () => {
        _this.checkConnect(true);
        _this.waiting(false);
        console.log("connected");
      }, () => {
        _this.waiting(false);
        console.log("disconnected");
      });

    }
    // window.$gama.doConnect();
  }
  tryLaunch() {
    // if (!this.gama.current.wSocket) {
    //   this.tryConnect();
    // }
    if (this.gama.current && this.gama.current.wSocket && this.gama.current.wSocket.readyState === 1) {
      // console.log(this.props.grid);
      this.setState((prevState) => ({
        loaded: false
      }));
      this.props.grid.waiting(true);
      this.waiting(true);
      // console.log(this.mySelRef);
      // console.log(this.mySelRef.props.inputValue); 
      // console.log((options_model.find(obj => obj.label === this.mySelRef.props.inputValue))); 
      var mm = (options_model.find(obj => obj.label === this.mySelRef.props.inputValue));
      if (mm === undefined) {
        mm = this.mySelRef.props.inputValue;
      } else {
        mm = mm.value;
      }
      this.gama.current.modelPath = mm.split("@")[0];
      this.gama.current.experimentName = mm.split("@")[1];

      // var modelPath = 'C:/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
      // var experimentName = 'road_traffic';
      var _this = this;
      this.gama.current.launch((e) => {
        // console.log(e);
        if (e.type === "CommandExecutedSuccessfully") {
          window.$loaded = true;
          this.setState((prevState) => ({
            loaded: true
          }));
          console.log("loaded " + this.state.loaded);
          _this.tryGenParam();
        }
        this.props.grid.waiting(false);
        this.waiting(false);
      });
      // this.gama.current.launch(_this.tryPlay);

    }
    // window.$gama.doConnect();
  }

  tryGenParam() {

    if (this.gama.current && this.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 

      var _this = this;
      this.gama.current.evalExpr("experiment.parameters.pairs", function (ee) {

        if (JSON.parse(ee).content && JSON.parse(ee).type === "CommandExecutedSuccessfully") {
          _this.props.grid.addParam(ee);
          _this.props.grid.onShowClick(function () { console.log("shown") });
        }
      });
    }
  }
  // tryLoad() {
  //   this.fileUploadInput.current.click();
  // }
  // trySave() {
  //   getLocalstorageToFile("layout.txt");
  // }
  tryAdd() {
    this.props.grid.current.addWidget();
  }
  tryExperiment() {
    this.props.grid.current.addExperiment();
  }
  tryEdit() {
    this.props.grid.current.toggleEdit();
  }
  getNFromLS(key) {
    let ls = {};
    if (global.localStorage) {
      try {
        ls = JSON.parse(global.localStorage.getItem("rdv_nav")) || {};
        // console.log(ls);
      } catch (e) {
        console.log(e);
      }
    }
    return ls[key];
  }

  saveNToLS(key, value) {
    if (global.localStorage) {
      global.localStorage.setItem(
        "rdv_nav",
        JSON.stringify({
          [key]: value
        })
      );
    }
  }
}

function getLocalstorageToFile(fileName) {

  /* dump local storage to string */

  var a = {};
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    var v = localStorage.getItem(k);
    a[k] = v;
  }

  /* save as blob */

  var textToSave = JSON.stringify(localStorage);
  // console.log((localStorage));

  var textToSaveAsBlob = new Blob([textToSave], {
    type: "text/plain"
  });
  var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);

  /* download without button hack */

  var downloadLink = document.createElement("a");
  downloadLink.download = fileName;
  downloadLink.innerHTML = "Download File";
  downloadLink.href = textToSaveAsURL;
  downloadLink.onclick = function (event) {
    document.body.removeChild(event.target);
  };
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();

}

export default OptionsBar;

