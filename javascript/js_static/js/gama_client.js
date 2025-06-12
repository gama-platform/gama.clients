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
var modelPath = "C:\\Users\\baptiste\\Documents\\GitHub\\SaReine\\SaReine\\models\\Plan_des_pistes.gaml";
var experimentName = 'demo';
var species1Name = 'people';
var attribute1Name = 'objective';
var species2Name = 'building';
var attribute2Name = 'type';


const experiment = new GAMA("ws://localhost:6868/", modelPath, experimentName);
experiment.connect(on_connected, on_disconnected);

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
		console.log(eee);
		console.log(eee[1].split(":")[1]);
		console.log(eee[2].split(":")[1]);
		var x = parseFloat(eee[1].split(":")[1]);
		var y = parseFloat(eee[2].split(":")[1]);
		console.log(x, y);
		map.flyTo({
			center: [x, y],
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
	center: [-7.991405559068491,31.62418156481035], // TLU -84.5, 38.05starting position 
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
