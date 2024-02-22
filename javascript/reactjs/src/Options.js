import React, { useState } from 'react'
import { Fab, Action } from 'react-tiny-fab';
import 'react-tiny-fab/dist/styles.css';
import { Button } from 'reactstrap';
import { Dropdown } from 'primereact/dropdown';


const options_server = [{ value: "ws://51.255.46.42:6001", label: 'ovh' }];
const options_model = [{ value: "/Users/hqn88/git/gama/msi.gama.models/models", label: 'mym1' },
{value: "C:/git/gama/msi.gama.models/models", label: 'win' },
{value: "/opt/gama-platform/configuration/org.eclipse.osgi/22/0/.cp/models", label: 'docker' },
{value: "/var/www/github/gama/msi.gama.models/models", label: 'ovh'}]; 

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
  model_path: '/Users/hqn88/git/gama/msi.gama.models/models'
};

// const components = [
//   {
//     position: {
//       bottom: 0,
//       left: 0,
//     },
//     event: 'hover',
//     alwaysShowTitle: true,
//     mainButtonStyles: {
//       backgroundColor: 'dodgerblue', borderRadius: 8
//     },
//     actionButtonStyles: {
//       backgroundColor: 'dodgerblue', borderRadius: 8,
//       color: '#fff',
//     },
//   },
// ];

class OptionsBar extends React.Component {
  constructor(param) {
    super(param);
    this.mySelRef = React.createRef();
    this.id = "m" + param.id;
    this.state = this.getNFromLS("Nav") || default_Nav_state;
    // this.gama = param.gama;  
    this.fileUploadInput = React.createRef();

    this.checkConnect = this.checkConnect.bind(this);
    this.fetchFile = this.fetchFile.bind(this);
    this.onFileChange = this.onFileChange.bind(this);
    this.handleChangeServer = this.handleChangeServer.bind(this);
    this.handleChangeModel = this.handleChangeModel.bind(this);
    this.tryConnect = this.tryConnect.bind(this);
    // this.tryAdd = this.tryAdd.bind(this);
    // this.tryExperiment = this.tryExperiment.bind(this);
    // this.tryEdit = this.tryEdit.bind(this);
    // this.trySave = this.trySave.bind(this);
    // this.tryLoad = this.tryLoad.bind(this);
    this.waiting = this.waiting.bind(this);
  }

  componentDidMount(props) {
    this.setState((prevState) => ({
      connected: false,
      loaded: false
    }));
    this.tryConnect();
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

  checkConnect(b) {
    this.setState((prevState) => ({
      connected: b
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
    // if(!this.state.connected){
    //   this.tryConnect();
    // }
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
        <tr><td><button style={{ width: 200, height: 40, textAlign: 'center' }} onClick={this.props.login.logout}>
            Logout
          </button></td></tr>
      </tbody></table>





    </div></>);

    return <>
      {renderComponents}
      <input hidden ref={this.fileUploadInput} id="fileUpload" type="file" onChange={this.onFileChange} accept="text/plain" />
    </>

  }

  tryConnect() { 
    this.checkConnect(true);
    var _this = this; 
    if (!this.props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 
        // this.waiting(true);

        this.props.gama.current.connect(this.state.url,this.state.model_path, () => {
            // _this.waiting(false);
            console.log("connected");
        }, () => {
            // _this.waiting(false);
            console.log("disconnected");
        });

    }
    // window.$gama.doConnect();
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
 

export default OptionsBar;

