import React, { useState, useEffect } from 'react'
// import { Fab, Action } from 'react-tiny-fab'; 
import 'react-tiny-fab/dist/styles.css';
import { Button } from 'reactstrap';
import { Dropdown } from 'primereact/dropdown';
import { useLocalStorage } from '../utils';

import { useSelector } from "react-redux"
import AccountMenu from '../components/NavBar/AccountMenu/AccountMenu';


const options_server = [{ value: "wss://51.255.46.42.nip.io:6001", label: 'ovh' }];
const options_model = [{ value: "/Users/hqn88/git/gama/msi.gama.models/models", label: 'mym1' },
{ value: "C:/git/gama/msi.gama.models/models", label: 'win' },
{ value: "/opt/gama-platform/headless/configuration/org.eclipse.osgi/20/0/.cp/models", label: 'docker' },
{ value: "/var/www/github/gama/msi.gama.models/models", label: 'ovh' }];

if (process.env.REACT_APP_ENABLE_LOCALHOST_GAMA) {
  const url = (process.env.REACT_APP_USE_SECURE_WEBSOCKET>0 ? 'wss' : 'ws') + '://localhost:' + process.env.REACT_APP_LOCALHOST_GAMA_PORT;
  options_server.push({ value: url, label: 'Local GAMA' });

  options_model.push({ value: process.env.REACT_APP_LOCALHOST_COMOKIT_GIT_WORKSPACE + '/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures', label: '[LOCAL] MESO - Closures' });
  options_model.push({ value: process.env.REACT_APP_LOCALHOST_COMOKIT_GIT_WORKSPACE + '/Macro/Models/Experiments/No containment.gaml@No Containment', label: '[LOCAL] MACRO - No Containment' });
}

if (process.env.REACT_APP_ENABLE_REMOTE_GAMA) {
  const url = (process.env.REACT_APP_USE_SECURE_WEBSOCKET>0 ? 'wss' : 'ws') + '://' + process.env.REACT_APP_REMOTE_GAMA_IP + ':' + process.env.REACT_APP_REMOTE_GAMA_PORT;
  options_server.push({ value: url, label: 'Remote GAMA' });

  options_model.push({ value: process.env.REACT_APP_REMOTE_COMOKIT_GIT_WORKSPACE + '/Meso/Models/Experiments/Activity Restrictions/School and Workplace Closure.gaml@Closures', label: '[REMOTE] MESO - Closures' });
  options_model.push({ value: process.env.REACT_APP_REMOTE_COMOKIT_GIT_WORKSPACE + '/Macro/Models/Experiments/No containment.gaml@No Containment', label: '[REMOTE] MACRO - No Containment' });
}


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
function OptionsBar(props) {
  const loginState = useSelector(state => state.auth);
  const [serverURL, setServerURL] = useLocalStorage("serverURL", "wss://51.255.46.42:6001");
  // = useState('ws://51.255.46.42:6001');
  const [modelURL, setModelURL] = useLocalStorage("modelURL", "C:/git/gama/msi.gama.models/models");
  // useState('/Users/hqn88/git/gama/msi.gama.models/models');
  const [connected, setConnected] = useState(false);

  const tryConnect = () => {
    // console.log(loginState);
    // console.log(props.gama)
    // this.checkConnect(true);
    if (!props.gama.current.wSocket) {// && this.gama.current.wSocket.readyState!==1 
      // this.waiting(true);
      if(process.env.REACT_APP_USE_SANDBOX>0 && loginState.port!==0){
        setServerURL("wss://"+process.env.REACT_APP_GAMA_IP+":"+loginState.port);
        // setServerURL("wss://51.255.46.42.nip.io:"+loginState.port);
        setModelURL("/opt/gama-platform/headless/configuration/org.eclipse.osgi/20/0/.cp/models");
        //https://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate
        //https://www.baeldung.com/convert-pem-to-jks
        // setServerURL("wss://localhost:6868");
        // setModelURL("/Users/hqn88/git/gama/msi.gama.models/models");
      }
      props.gama.current.connect(serverURL, modelURL, () => {
        // _this.waiting(false);
        console.log("connected ");
        setConnected(true);
      }, () => {
        // _this.waiting(false);
        console.log("disconnected");
      });

    }
    // window.$gama.doConnect();
  }


  useEffect(() => {
    if (!connected) {
      setTimeout(() => {
        tryConnect();
      }, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  return (<>
    <AccountMenu />
    <div>
      <table><tbody>

        <tr><td>
          <Dropdown value={serverURL} options={options_server} optionLabel="label" onChange={(e) => setServerURL(e.target.value)}
            editable placeholder="url" className="w-full md:w-14rem" />

          {!connected && <Button color="primary" style={{ width: "80px" }} size="sm" onClick={tryConnect}>Connect</Button>}

          <Dropdown value={modelURL} options={options_model} optionLabel="label" onChange={(e) => setModelURL(e.target.value)}
            editable placeholder="Root path" className="w-full md:w-14rem" />
        </td></tr>
      </tbody></table>
    </div>
    {/* <input hidden ref={this.fileUploadInput} id="fileUpload" type="file" onChange={this.onFileChange} accept="text/plain" /> */}
  </>);


}



export default OptionsBar;

