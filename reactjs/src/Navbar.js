import React from 'react'
// import GAMA from "./GAMA";
import { Fab, Action } from 'react-tiny-fab';
import 'react-tiny-fab/dist/styles.css';

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
      backgroundColor: 'dodgerblue',borderRadius: 8,
      color: '#fff',
    },
  },
];

class NavigationBar extends React.Component {
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
    this.handleChange = this.handleChange.bind(this); 
    this.tryAdd = this.tryAdd.bind(this);
    this.tryExperiment = this.tryExperiment.bind(this);
    this.tryEdit = this.tryEdit.bind(this);
    this.trySave = this.trySave.bind(this);
    this.tryLoad = this.tryLoad.bind(this);
    this.waiting = this.waiting.bind(this);
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

  handleChange(e) {
    // console.log(e.target.value);
    this.setState({
      [e.target.name]: e.target.value
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
    const renderComponents = c =>
      c.map(({ mainButtonStyles, actionButtonStyles, position, event, alwaysShowTitle }, i) => (
        <Fab
          mainButtonStyles={mainButtonStyles}
          style={position}
          icon="☰"
          event={event}
          key={i}
          alwaysShowTitle={alwaysShowTitle}
        >
          <Action
            style={actionButtonStyles}
            text="Import"
            onClick={this.tryLoad}
          >
            O
          </Action>
          <Action style={actionButtonStyles} text="Export" onClick={this.trySave}>
            S
          </Action>
          <Action style={actionButtonStyles} text="Add widget" onClick={this.tryAdd}>
            +
          </Action>
          <Action style={actionButtonStyles} text="Edit layout" onClick={this.tryEdit}>
            ✎
          </Action>
        </Fab>
      ));
     return <>
      {renderComponents(components)}
      <input hidden ref={this.fileUploadInput} id="fileUpload" type="file" onChange={this.onFileChange} accept="text/plain" />
    </> 

  }


  tryLoad() {
    this.fileUploadInput.current.click();
  }
  trySave() {
    getLocalstorageToFile("layout.txt");
  }
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

export default NavigationBar;

