mapboxgl.accessToken = 'pk.eyJ1IjoiaHFuZ2hpODgiLCJhIjoiY2t0N2w0cGZ6MHRjNTJ2bnJtYm5vcDB0YyJ9.oTjisOggN28UFY8q1hiAug';


var socket_id = 0;
var exp_id = 0;
var updateSource;
var updateSource2;
var updateSource3;
var canCallStaticLayer = Boolean(false);
var staticLayerCalled = Boolean(false);

//VISUALIZATION
//Get the 3D building layer from MapBox
var show3DBuilding = Boolean(false);

//SOCKET
var wSocket = new WebSocket("ws://localhost:6868/");

//GAMA PATH
var ABSOLUTE_PATH_TO_GAMA = 'C:\\git\\';
// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
// var experimentName = 'road_traffic';
// var species1Name = 'people';
// var attribute1Name = 'objective';
// var species2Name = 'building';
// var attribute2Name = 'type';

// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Predator Prey/models/Model 08.gaml';
// var experimentName = 'prey_predator';
// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Toy Models/Boids/models/Boids.gaml';
// var experimentName = 'Basic';

var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Luneray flu/models/model5.gaml';
var experimentName = 'main';
// var modelPath = 'C:\\git\\UD_ReAgent_ABM/ReAgent/models/Gratte_Ciel_Basic.gaml';
// var experimentName = 'GratteCielErasme';
// var species1Name = 'people';
// var attribute1Name = 'type';
// var species2Name = 'building';
// var attribute2Name = 'type';


var queue = [];
var request = "";
var result = "";
var updateSource;
let executor_speed = 1;
var executor = setInterval(() => {
	if (queue.length > 0 && request === "") {
		request = queue.shift();
		request.exp_id = exp_id;
		request.socket_id = socket_id;
		wSocket.send(JSON.stringify(request));
		// console.log("request " + JSON.stringify(request));
		wSocket.onmessage = function (event) {
			msg = event.data;
			if (event.data instanceof Blob) { } else { 
				// console.log(msg);
				if (request.callback) {
					request.callback(msg);
				} else {
					request = "";
				}
			}
		}
	}

}, executor_speed);

wSocket.onclose = function (event) {
	clearInterval(executor);
	clearInterval(updateSource);
};
wSocket.addEventListener('open', (event) => {
	start_sim();
	start_renderer();
});
var geojsonMap = new Map();
function start_sim() {
	var cmd = {
		"type": "launch",
		"model": modelPath,
		"experiment": experimentName,
		"auto-export": false,
		"callback": function (e) {
			console.log(e);
			result = JSON.parse(msg);
			if (result.exp_id) exp_id = result.exp_id;
			if (result.socket_id) socket_id = result.socket_id;
			request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
		}

	};
	queue.push(cmd);
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "species(world).microspecies",
		"callback": function (ee) {
			ee = JSON.parse(ee).result.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
			var eee = ee.split(",");
			eee.forEach((e) => {
				geojsonMap.set(e, {
					'type': 'FeatureCollection',
					'features': [
						{
							'type': 'Feature',
							'geometry': {
								'type': 'Point',
								'coordinates': [0, 0]
							}
						}
					]
				});
				map.addSource(`source${e}`, {
					type: 'geojson',
					data: geojsonMap.get(e)
				});
			});

			geojsonMap.forEach(logMapElements);
			request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
		}
	};
	queue.push(cmd);
	cmd = {
		"type": "expression",
		"socket_id": socket_id,
		"exp_id": exp_id,
		"expr": "CRS_transform(world.location,\"EPSG:4326\")",
		"callback": function (ee) {
			ee = JSON.parse(ee).result.replace(/[{}]/g, "");
			var eee = ee.split(",");
			console.log(eee[0]);
			console.log(eee[1]);
			map.flyTo({
				center: [eee[0], eee[1]],
				duration: 0,
				zoom: 15
			});
			document.getElementById('div-loader').remove();
			request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
		}
	};
	queue.push(cmd);
	cmd = {
		"type": "play",
		"socket_id": socket_id,
		"exp_id": exp_id
	};
	queue.push(cmd);
}
function start_renderer() {
	updateSource = setInterval(() => {

		geojsonMap.forEach(logMapElements);
	}, 100);
}
function logMapElements(value, key, mm) {
	// console.log(`m[${key}] = ${value}`);
	// console.log(key);
	// console.log(value);
	cmd = {
		'type': 'output',
		'species': key,
		// 'attributes': [attribute1Name],
		"crs": 'EPSG:4326',
		'socket_id': socket_id,
		'exp_id': exp_id,
		"callback": function (message) {
			if (typeof message == "object" || message=="") {

			} else {
				// geojson = null;
				// console.log(message);
				var tmp = JSON.parse(message);
				if(!map.style.getLayer( `source${key}`))
				addLayer(tmp.features[0].geometry.type, key);
				map.getSource(`source${key}`).setData(tmp);

			}
			request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
		}
	};
	queue.push(cmd);
}

function addLayer(type, key) {

	if (type === 'LineString') {
		map.addLayer({
			'id': `source${key}`,
			'type': 'line',
			'source': `source${key}`, // reference the data source
			'layout': {},
			'paint': {
				'line-color': '#000',
				'line-width': 3
			}
		});
	} else if (type === 'Point') {

		map.addLayer({
			'id': `source${key}`,
			'type': 'circle',
			'source': `source${key}`, // reference the data source
			'layout': {},
			'paint': {
				'circle-radius': {
					'base': 1.75,
					'stops': [
						[12, 1],
						[22, 50]
					]
				},
			}
		});
	} else {

		map.addLayer({
			'id': `source${key}`,
			'type': 'fill',
			'source': `source${key}`, // reference the data source
			'layout': {},
			'paint': {
				'fill-color': '#0080ff', // blue color fill
				'fill-opacity': 0.5
			}
		});
	}
}
const map = new mapboxgl.Map({
	container: 'map', // container id
	// style: 'mapbox://styles/mapbox/dark-v10',
	// style: {version: 8,sources: {},layers: []},

	// pitch: 45,
	// bearing: -17.6,
	// antialias: true,
	center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position  [6.069437036914885,45.09389334701125],//
	zoom: 13 // starting zoom
});

// var geojson = {
// 	'type': 'FeatureCollection',
// 	'features': [
// 		{
// 			'type': 'Feature',
// 			'geometry': {
// 				'type': 'Point',
// 				'coordinates': [0, 0]
// 			}
// 		}
// 	]
// };
// map.on('load', async () => {
	// Add the source1 location as a source.
/*
map.addSource('source1', {
	type: 'geojson',
	data: geojson
});
map.addSource('source2', {
	type: 'geojson',
	data: geojson
});
map.addLayer({
	'id': 'source1',
	type: 'circle',
	'source': 'source1',
	'layout': {},
	'paint': {
		'circle-radius': {
			'base': 1.75,
			'stops': [
				[12, 1],
				[22, 50]
			]
		},
		'circle-color': ['match', ['get', attribute1Name], // get the property
			"ok", 'green',
			"notok", 'red',
			"resting", 'green',
			"working", 'red',
			"car", 'red',
			"bike", 'green',
			"pedestrian", 'blue',
			'white'],

	},
});
map.addLayer({
	'id': 'source2',
	type: 'fill',
	'source': 'source2',
	'layout': {},
	'paint': {
		'fill-color': ['match', ['get', attribute2Name], // get the property
			"commerce", 'green',
			"gare", 'red', "Musee", 'red',
			"habitat", 'blue', "culte", 'blue', "Industrial", 'blue',
			'gray'],

	},
});  
*/