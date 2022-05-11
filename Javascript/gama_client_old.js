mapboxgl.accessToken = 'pk.eyJ1IjoiaHFuZ2hpODgiLCJhIjoiY2t0N2w0cGZ6MHRjNTJ2bnJtYm5vcDB0YyJ9.oTjisOggN28UFY8q1hiAug';

const map = new mapboxgl.Map({
	container: 'map', // container id
	style: 'mapbox://styles/mapbox/dark-v10',
	pitch: 45,
	bearing: -17.6,
	antialias: true,
	center: [0, 0], //  -84.5, 38.05starting position 
	zoom: 13 // starting zoom
});

var socket_id = "";
var exp_id = 0; 
var updateSource; 
var updateSource2;
var updateSource3;
var canCallStaticLayer = Boolean(false);
var staticLayerCalled = Boolean(false);

//VISUALIZATION
var show3DBuilding = Boolean(false);

//SOCKET
var launchSocket = new WebSocket("ws://localhost:6868/launch");
var outputSocket = new WebSocket("ws://localhost:6868/output");

//GAMA PATH
var ABSOLUTE_PATH_TO_GAMA = '/Users/arno/git/';
var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml'; 
var experimentName='road_traffic';
var species1Name='people';
var attribute1Name='objective';
var species2Name='building';
var attribute2Name='type';

outputSocket.onclose = function (event) {
	clearInterval(updateSource);
};
launchSocket.addEventListener('open', (event) => {
	var cmd = {
		'type': 'launch',
		'model': modelPath,
		'experiment': experimentName,
		'auto-export': 'true'
	};
	launchSocket.send(JSON.stringify(cmd));
	launchSocket.onmessage = function (event) {
		exp_compiled = event.data;
		if (exp_compiled.startsWith("exp@")) {
			const myArray = exp_compiled.split("@");
			socket_id = myArray[1];
			exp_id = myArray[2];
			map.flyTo({
				center: [myArray[4], myArray[5]],
				essential: true,
				zoom: 15
			});
			cmd = {
				'type': 'play',
				'model': modelPath,	
				'experiment': experimentName,
				'id_exp': exp_id,
			};
			launchSocket.send(JSON.stringify(cmd));
			updateSource = setInterval(() => {
				cmd = {
					'type': 'output',
					'model': modelPath,
					'experiment': experimentName,
					'species': species1Name,
					'attributes': [attribute1Name],
					'socket_id': socket_id,
					'id_exp': exp_id,
				};
				outputSocket.send(JSON.stringify(cmd));
				outputSocket.onmessage = function (event) {
					let message = event.data;
					if (typeof event.data == "object") {

					} else {
						geojson = null;
						geojson = JSON.parse(message);
						console.log(geojson);
						map.getSource('source1').setData(geojson);
						canCallStaticLayer=true;

					}
				}
				if(canCallStaticLayer && !staticLayerCalled){
					cmd = {
					'type': 'output',
					'model': modelPath,
					'experiment': experimentName,
					'species': species2Name,
					'attributes': [attribute2Name],
					'socket_id': socket_id,
					'id_exp': exp_id,
					};
					outputSocket.send(JSON.stringify(cmd));
					outputSocket.onmessage = function (event) {
						let message = event.data;
						if (typeof event.data == "object") {

						} else {
							geojson = null;
							geojson = JSON.parse(message);
							console.log(geojson);
							map.getSource('source2').setData(geojson);
						}
					}
					canCallStaticLayer=false;
					staticLayerCalled=true;
				}
				
			}, 100);
		}
	}
});
var geojson = {
	'type': 'FeatureCollection',
	'features': [
		{
			'type': 'Feature',
			'geometry': {
				'type': 'Point',
				'coordinates': [21.276612216569756, 105.6788139592465]
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
				"gare", 'red',"Musee", 'red',
				"habitat", 'blue',"culte", 'blue',   "Industrial", 'blue',          
				'gray'], 

		},
	});
	const layers = map.getStyle().layers;
	const labelLayerId = layers.find(
		(layer) => layer.type === 'symbol' && layer.layout['text-field']
	).id;
	if(show3DBuilding){	
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
});