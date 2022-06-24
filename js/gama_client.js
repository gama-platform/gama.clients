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
/*var ABSOLUTE_PATH_TO_GAMA = '/Users/arno/git/';
var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
var experimentName = 'road_traffic';
var species1Name = 'people';
var attribute1Name = 'objective';
var species2Name = 'building';
var attribute2Name = 'type';*/



// var modelPath = 'C:\\git\\UD_ReAgent_ABM/ReAgent/models/Gratte_Ciel_Basic.gaml';
// var experimentName = 'GratteCielErasme';
// var species1Name = 'people';
// var attribute1Name = 'type';
// var species2Name = 'building';
// var attribute2Name = 'type';


var modelPath = 'C:\\git\\UD_ReAgent_ABM\\ReAgent\\models\\Gratte_Ciel_Basic.gaml';
var experimentName = 'GratteCielErasme';
var species1Name = 'people';
var attribute1Name = 'type';
// const modelPath = '/Users/arno/Projects/GitHub/UD_ReAgent_ABM/ReAgent/models/Gratte_Ciel_Basic.gaml';
// const experimentName = 'GratteCielErasme';
// const species1Name = 'people';
// const attribute1Name = 'type';
const species2Name = 'building';
const attribute2Name = 'type';


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
		// console.log("request " + JSON.stringify(req));
		wSocket.onmessage = function (event) {
			msg = event.data;
			if (event.data instanceof Blob) { } else {
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
});

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
		"expr": "CRS_transform(world.location,\"EPSG:4326\")",
		"callback": function (ee) {
			ee = JSON.parse(ee).result.replace(/[{}]/g, "");
			var eee = ee.split(",");
			console.log(eee[0]);
			console.log(eee[1]);
			map.flyTo({
				center: [eee[0], eee[1]],
				essential: true,
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

	cmd = {
		'type': 'output',
		'species': species2Name,
		'attributes': [attribute2Name],
		'socket_id': socket_id,
		'exp_id': exp_id,     
		"crs":'EPSG:4326',
		"callback": function (message) {
			if (typeof event.data == "object") {

			} else {
				geojson = null;
				geojson = JSON.parse(message);
				// console.log(geojson);
				map.getSource('source2').setData(geojson);
			}
			request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
		}
	};
	queue.push(cmd);
	updateSource = setInterval(() => {
		cmd = {
			'type': 'output',
			'species': species1Name,
			'attributes': [attribute1Name],
			"crs":'EPSG:4326',
			'socket_id': socket_id,
			'exp_id': exp_id,
			"callback": function (message) {
				if (typeof event.data == "object") {

				} else {
					geojson = null;
					geojson = JSON.parse(message);
					// console.log(geojson);
					map.getSource('source1').setData(geojson);
					canCallStaticLayer = true;

				}
				request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
			}
		};
		queue.push(cmd);
	}, 100);
}
const map = new mapboxgl.Map({
	container: 'map', // container id
	style: 'mapbox://styles/mapbox/dark-v10',
	pitch: 45,
	bearing: -17.6,
	antialias: true,
	center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position 
	zoom: 13 // starting zoom
});

var geojson = {
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
};
map.on('load', async () => {
	// Add the source1 location as a source.
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
	const layers = map.getStyle().layers;
	const labelLayerId = layers.find(
		(layer) => layer.type === 'symbol' && layer.layout['text-field']
	).id;
	if (show3DBuilding) {
		map.addLayer(
			{
				'id': 'add-3d-buildings',
				'source': 'composite',
				'source-layer': 'building',
				'filter': ['==', 'extrude', 'true'],
				'type': 'fill-extrusion',
				'minzoom': 15,
				'paint': {
					'fill-extrusion-color': '#aaa',
					'fill-extrusion-height': [
						'interpolate',
						['linear'],
						['zoom'],
						15,
						0,
						15.05,
						['get', 'height']
					],
					'fill-extrusion-base': [
						'interpolate',
						['linear'],
						['zoom'],
						15,
						0,
						15.05,
						['get', 'min_height']
					],
					'fill-extrusion-opacity': 0.6
				}
			},
			labelLayerId
		);
	}
	// Add some fog in the background
	map.setFog({
		'range': [-0.5, 5],
		'color': 'white',
		'horizon-blend': 0.2
	});
	// Add a sky layer over the horizon
	map.addLayer({
		'id': 'sky',
		'type': 'sky',
		'paint': {
			'sky-type': 'atmosphere',
			'sky-atmosphere-color': 'rgba(85, 151, 210, 0.5)'
		}
	});
	// Add terrain source, with slight exaggeration
	map.addSource('mapbox-dem', {
		'type': 'raster-dem',
		'url': 'mapbox://mapbox.terrain-rgb',
		'tileSize': 512,
		'maxzoom': 14
	}); 
	map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
	map.setLight({ anchor: 'map' });
	start_renderer();
});
