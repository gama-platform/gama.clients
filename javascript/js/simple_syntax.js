
// var ABSOLUTE_PATH_TO_GAMA = 'C:\\git\\';
// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml'; 
// var modelPath =  '/var/www/github/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';

var modelPath='/Users/hqn88/git/gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
var experimentName = 'road_traffic';
// const experiment = new GAMA("ws://51.255.46.42:6001/", modelPath, experimentName);
var experiment=null;
function connect(){
	const host=document.getElementById("host").value;
	const port=document.getElementById("socket").value;
	experiment = new GAMA("ws://"+host+":"+port+"/", modelPath, experimentName);
	experiment.logger = log;
	experiment.connect(on_connected);
}
function load(){
	if(experiment==null) return;
	// console.log(document.getElementById("model").value);
	experiment.modelPath=document.getElementById("model").value;
	experiment.experimentName=document.getElementById("exp_name").value;

	experiment.setParameters([
		{ "name": "Number of people agents", "value": 111, "type": "int" },
		{ "name": "Value of destruction when a people agent takes a road", "value": 0.2, "type": "float" }
	]);
	experiment.setEndCondition("cycle>=15");
    experiment.launch(onReceiveMsg);
}
function play(){
	if(experiment==null) return;
	experiment.play(onReceiveMsg);

}

function step(){
	if(experiment==null) return;
	experiment.step(onReceiveMsg);

}
function eval(){
	if(experiment==null) return;

	experiment.evalExpr("create people number:100;", onReceiveMsg);
	experiment.evalExpr("length(people)", onReceiveMsg);
	experiment.evalExpr("cycle", onReceiveMsg);

}
function reload(){
	if(experiment==null) return;
	
	experiment.setParameters([
		{ "name": "Number of people agents", "value": "333", "type": "int" },
		{ "name": "Value of destruction when a people agent takes a road", "value": "0.2", "type": "float" }
	]);
	experiment.setEndCondition("cycle>=10000");
	experiment.reload();
}
function on_connected() {
	onReceiveMsg("connected");
	
	// experiment.evalExpr("cycle", onReceiveMsg);


	// experiment.play();
	// experiment.evalExpr("length(people)", onReceiveMsg);
	// experiment.evalExpr("cycle", onReceiveMsg);

}

function onReceiveMsg(e) {
	log(e);
}

function log(e) {
	const element = document.getElementById("output");
	element.innerHTML +=(e);
	element.innerHTML +=("</br>");
	element.innerHTML +=("------------------------------");
	element.innerHTML +=("</br>");
}