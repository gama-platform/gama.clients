
//SOCKET
var launchSocket = new WebSocket("ws://localhost:6868/");

//GAMA PATH
var ABSOLUTE_PATH_TO_GAMA = 'C:\\git\\';
var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
var experimentName = 'road_traffic';
var species1Name = 'people';
var attribute1Name = 'objective';
var species2Name = 'building';
var attribute2Name = 'type';

var queue = [];
var a_request = "";
var result = "";
var socket_id = 0;
var exp_id = 0;
var executor_speed = 1;
var executor = setInterval(() => {
	if (queue.length > 0 && a_request === "") {
		a_request = queue.shift();
		a_request.exp_id = exp_id;
		a_request.socket_id = socket_id;
		launchSocket.send(JSON.stringify(a_request));
		log("request " + JSON.stringify(a_request));
		launchSocket.onmessage = function (event) {
			msg = event.data;
			if (event.data instanceof Blob) { } else {
				if (a_request.callback) {
					a_request.callback(msg);
				} else {
					a_request = "";
				}
			}
		}
	}

}, executor_speed);
launchSocket.onclose = function (event) {
	clearInterval(executor);
};
function onReceiveMsg(e) {
	log(e);
	a_request = "";
}
launchSocket.addEventListener('open', (event) => {
	var cmd = {
		"type": "launch",
		"model": modelPath,
		"experiment": experimentName,
		"parameters": [
			{ "name": "Number of people agents", "value": "111", "type": "int" },
			{ "name": "Value of destruction when a people agent takes a road", "value": "0.2", "type": "float" }
		],
		"until": "cycle>=15",
		"callback": function (e) {
			log(e);
			result = JSON.parse(msg);
			if (result.exp_id) exp_id = result.exp_id;
			if (result.socket_id) socket_id = result.socket_id;
			a_request = "";
			// setTimeout(function(){
			// },5000);
		}

	};
	queue.push(cmd);
	// cmd = {
	// 	"type": "expression",
	// 	"socket_id": socket_id,
	// 	"exp_id": exp_id,
	// 	"expr": "CRS_transform(world.shape,\"EPSG:4326\").location",
	// 	"callback": function (ee) {
	// 		ee = JSON.parse(ee).result.replace(/[{}]/g, "");
	// 		var eee = ee.split(",");
	// 		log(eee[0]);
	// 		log(eee[1]);
	// 		a_request = "";
	// 	}
	// };
	// queue.push(cmd);
	cmd = {
		"type": "play",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"callback":function (e){
			log(e);
			setTimeout(function(){
				a_request="";
			},1000);
		}
	};
	queue.push(cmd);
	// cmd = {
	// 	"type": "expression",
	// 	"socket_id": socket_id,
	// 	"exp_id": exp_id,
	// 	"expr": "length(people)",
	// 	"callback": onReceiveMsg
	// };
	// queue.push(cmd);
	// cmd = {
	// 	"type": "expression",
	// 	"socket_id": socket_id,
	// 	"exp_id": exp_id,
	// 	"expr": "ask 10 among people{do die;}",
	// 	"callback": onReceiveMsg
	// };
	// queue.push(cmd);
	// cmd = {
	// 	"type": "expression",
	// 	"socket_id": socket_id,
	// 	"exp_id": exp_id,
	// 	"expr": "length(people)",
	// 	"callback": onReceiveMsg
	// };
	// queue.push(cmd);
	// cmd = {
	// 	"type": "expression",
	// 	"socket_id": socket_id,
	// 	"exp_id": exp_id,
	// 	"expr": "create people number:100;",
	// 	"callback": onReceiveMsg
	// };
	// queue.push(cmd);
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "length(people)",
		"callback": onReceiveMsg
	};
	queue.push(cmd); 
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "cycle",
		"callback": onReceiveMsg
	};
	queue.push(cmd);

	cmd = {
		"type": "reload",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"parameters": [
			{ "name": "Number of people agents", "value": "333", "type": "int" },
			{ "name": "Value of destruction when a people agent takes a road", "value": "0.2", "type": "float" }
		],
		"until": "cycle>=10000",
		"callback": onReceiveMsg
	};
	queue.push(cmd);

	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "cycle",
		"callback": onReceiveMsg
	};
	queue.push(cmd);

	cmd = {
		"type": "play",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"callback":function (e){
			log(e);
			
			setTimeout(function(){
				a_request="";
			},1000);
		}
	};
	queue.push(cmd);
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "length(people)",
		"callback": onReceiveMsg
	};
	queue.push(cmd);
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "cycle",
		"callback": onReceiveMsg
	};
	queue.push(cmd);
});


function log(e) {
	document.write(e);
	document.write("</br>");
	document.write("------------------------------");
	document.write("</br>");
}