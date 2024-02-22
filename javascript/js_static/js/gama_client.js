mapboxgl.accessToken = 'pk.eyJ1IjoiYWdyaWduYXJkIiwiYSI6ImNqdWZ6ZjJ5MDBoenczeXBkYWU3bTk5ajYifQ.SXiCzAGs4wbMlw3RHRvxhw';


var updateSource;
var updateSource2;
var updateSource3;
var canCallStaticLayer = Boolean(false);
var staticLayerCalled = Boolean(false);

//VISUALIZATION
//Get the 3D building layer from MapBox
var show3DBuilding = Boolean(false);

//GAMA PATH

// var ABSOLUTE_PATH_TO_GAMA = '/Users/arno/git/'
// var modelPath = '/Users/arno/Projects/GitHub/SaReine/SaReine/models/Plan_des_pistes.gaml';
// var experimentName = 'demo';

var ABSOLUTE_PATH_TO_GAMA = '/Users/hqn88/git/'; 
var modelPath = ABSOLUTE_PATH_TO_GAMA+ 'gama/gama.library/models/Tutorials/Road Traffic/models/Model 05.gaml';
var experimentName = 'road_traffic';
var species1Name = 'people';
var attribute1Name = 'objective';
var species2Name = 'building';
var attribute2Name = 'type';


/*const modelPath = '/Users/arno/Projects/GitHub/UD_ReAgent_ABM/ReAgent/models/Gratte_Ciel_Demo.gaml';
const experimentName = 'Demo';
const species1Name = 'people';
const attribute1Name = 'type';
const species2Name = 'building';
const attribute2Name = 'type';*/

// var modelPath = 'C:\\git\\PROJECT\\COMOKIT-Model\\COMOKIT\\Meso\\Models\\Experiments\\Lockdown\\LockDown.gaml';
// var modelPath = 'C:\\git\\PROJECT\\COMOKIT-Model\\COMOKIT\\Meso\\Models\\Experiments\\Activity Restrictions\\School and Workplace Closure.gaml';
// var experimentName = 'Closures';
// var species1Name = 'Individual';
// var attribute1Name = 'state';

const experiment = new GAMA("ws://localhost:6868/", modelPath, experimentName);
function on_connected() {
	start_sim();
}

function on_disconnected() {
	clearInterval(updateSource);
}

function start_sim() {
	experiment.launch();
	experiment.evalExpr("CRS_transform(world.location,\"EPSG:4326\")", function (ee) {
		console.log(ee);
		ee = JSON.parse(ee).content.replace(/[{}]/g, "");
		var eee = ee.split(",");
		console.log(eee[0]);
		console.log(eee[1]);
		map.flyTo({
			center: [eee[0], eee[1]],
			essential: true,
			duration: 0,
			zoom: 15
		});
		document.getElementById('div-loader').remove();
		request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
	});

	experiment.play(()=>{start_renderer()});
}
function start_renderer() {
	experiment.evalExpr("to_geojson(" + species2Name + ",\"EPSG:4326\",[\"" + attribute2Name + "\"])", function (message) {
		if (typeof message == "object") {

		} else {
			var gjs = JSON.parse(message);
			if (gjs.content && gjs.type === "CommandExecutedSuccessfully") {
				var tmp = gjs.content;
				geojson = null;

				geojson = tmp;

				map.getSource('source2').setData(geojson);
			}
		}
	}, true);

	updateSource = setInterval(() => {
		experiment.evalExpr("to_geojson(" + species1Name + ",\"EPSG:4326\",[\"" + attribute1Name + "\"])", function (message) {

			if (typeof event.data == "object") {

			} else {

				try {

					var gjs = JSON.parse(message);
					if (gjs.content && gjs.type === "CommandExecutedSuccessfully") {
						var tmp = gjs.content;
						geojson = null;

						geojson = tmp;
						// console.log(geojson);

						map.getSource('source1').setData(tmp);
					}
				} catch (Exc) {
					console.log(message);
				}
				canCallStaticLayer = true;
			}
		}, true);
	}, 1);
}
const map = new mapboxgl.Map({
	container: 'map', // container id
	style: 'mapbox://styles/mapbox/satellite-v9',
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
			"circle-radius": 5,
			"circle-color": 'red'

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
	// const labelLayerId = layers.find(
	// 	(layer) => layer.type === 'symbol' && layer.layout['text-field']
	// ).id;
	// if (show3DBuilding) {
	// 	map.addLayer(
	// 		{
	// 			'id': 'add-3d-buildings',
	// 			'source': 'composite',
	// 			'source-layer': 'building',
	// 			'filter': ['==', 'extrude', 'true'],
	// 			'type': 'fill-extrusion',
	// 			'minzoom': 15,
	// 			'paint': {
	// 				'fill-extrusion-color': '#aaa',
	// 				'fill-extrusion-height': [
	// 					'interpolate',
	// 					['linear'],
	// 					['zoom'],
	// 					15,
	// 					0,
	// 					15.05,
	// 					['get', 'height']
	// 				],
	// 				'fill-extrusion-base': [
	// 					'interpolate',
	// 					['linear'],
	// 					['zoom'],
	// 					15,
	// 					0,
	// 					15.05,
	// 					['get', 'min_height']
	// 				],
	// 				'fill-extrusion-opacity': 0.6
	// 			}
	// 		},
	// 		labelLayerId
	// 	);
	// }
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
	map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.0 });
	// map.setLight({ anchor: 'map' });

	experiment.connect(on_connected, on_disconnected);
});
