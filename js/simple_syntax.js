
var ABSOLUTE_PATH_TO_GAMA = 'C:\\git\\';
var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
var experimentName = 'road_traffic';
const experiment = new GAMA("ws://localhost:6868/", modelPath, experimentName);
experiment.logger = log;
experiment.connect(on_connected);
function on_connected() {
	experiment.setParameters([
		{ "name": "Number of people agents", "value": 111, "type": "int" },
		{ "name": "Value of destruction when a people agent takes a road", "value": 0.2, "type": "float" }
	]);
	experiment.setEndCondition("cycle>=15");
	experiment.launch();
	experiment.play();
	experiment.evalExpr("create people number:100;", onReceiveMsg);
	experiment.evalExpr("length(people)", onReceiveMsg);
	experiment.evalExpr("cycle", onReceiveMsg);

	experiment.setParameters([
		{ "name": "Number of people agents", "value": "333", "type": "int" },
		{ "name": "Value of destruction when a people agent takes a road", "value": "0.2", "type": "float" }
	]);
	experiment.setEndCondition("cycle>=10000");
	experiment.reload();
	experiment.evalExpr("cycle", onReceiveMsg);


	experiment.play();
	experiment.evalExpr("length(people)", onReceiveMsg);
	experiment.evalExpr("cycle", onReceiveMsg);

}

function onReceiveMsg(e) {
	log(e);
}

function log(e) {
	document.write(e);
	document.write("</br>");
	document.write("------------------------------");
	document.write("</br>");
}