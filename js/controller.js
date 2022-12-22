

const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);
console.log(urlParams.get('m'));
console.log(urlParams.get('e'));
var geojsonMap = new Map();
var parameters = new Map();
var updateSource;
//GAMA PATH
var ABSOLUTE_PATH_TO_GAMA = "C:/git/gama/msi.gama.models/models/";
// var ABSOLUTE_PATH_TO_GAMA = "/Users/hqn88/git/gama/msi.gama.models/models/";

// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Luneray flu/models/model5.gaml';
// var experimentName = 'main';
// var modelPath = 'C:/git/gama/msi.gama.models/models/Toy Models/Traffic/models/Simple Traffic Model.gaml';
// var experimentName = 'traffic';
//file:///C:/git/gama.client/SimpleGUI_new.html?m=../../../PROJECT/COMOKIT-Model/COMOKIT/Meso/Models/Experiments/Activity%20Restrictions/School%20and%20Workplace%20Closure.gaml&e=Closures#model213
var modelPath = 'C:/git/gama/miat.gaml.extensions.pedestrian/models/Pedestrian Skill/models/Complex environment - walk.gaml';
var experimentName = 'normal_sim';
// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Toy Models/Urban Growth/models/Raster Urban Growth.gaml';
// var experimentName = 'raster';
// var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Toy Models/Flood Simulation/models/Hydrological Model.gaml';
// var experimentName = 'Run'; 
function on_connected() {
	start_sim();
	start_renderer();
}
function on_disconnected() {
	clearInterval(updateSource);
}
function start_sim() {
	gama.launch();
	gama.evalExpr("\"\"+CRS_transform(world.shape.points[1],\"EPSG:4326\")+\",\"+CRS_transform(world.shape.points[3],\"EPSG:4326\")", function (ee) {
		console.log(JSON.parse(ee));
		ee = JSON.parse(ee).content.replace(/[{}]/g, "").replace(/['"]+/g, '');
		var eee = ee.split(",");
		// console.log(eee);
		// console.log(eee[0]);
		// console.log(eee[1]);
		// console.log(eee[3]);
		// console.log(eee[4]);
		bbox = [
			[eee[0], eee[1]], // southwestern corner of the bounds
			[eee[3], eee[4]], // northeastern corner of the bounds
		];
	});
	gama.evalExpr("CRS_transform(world.location,\"EPSG:4326\")", fitzoom);
	// map.on('style.load', () => {
	// 	const waiting = () => {
	// 		if (!map.isStyleLoaded()) {
	// 			setTimeout(waiting, 200);
	// 		} else {
	// 			gama.evalExpr("species(world).microspecies", createSources);
	// 		}
	// 	};
	// 	waiting();
	// });

	gama.evalExpr("species(world).microspecies", createSources);
	gama.evalExpr("experiment.parameters.pairs", createParameters);

	// gama.play();
}

function start_renderer() {
	updateSource = setInterval(() => {
		if (gama.state === "play") {
			geojsonMap.forEach(logMapElements);
		}
	}, 100);
}

function stop_renderer() {
	clearInterval(updateSource);
}
function logMapElements(value, key, mm) {
	// if(key=='people'){

	gama.evalExpr("to_geojson("+key+",\"EPSG:4326\",[\"name\", \"color\"])", updateLayer,true);
	// gama.getPopulation(key, ["name", "color"], "EPSG:4326", updateLayer);
	// }

	function updateLayer(message, ccc) {
		if (typeof message == "object" || message == "") {

		} else {
			// console.log(key); 
			// geojson = null;
			try {
				var gjs=JSON.parse(message);
				var tmp = gjs.content; 
				if(tmp && gjs.type==="CommandExecutedSuccessfully"){

					if (!map.style.getLayer(`source${key}`)) {
						// console.log("layer added");
						addLayer(tmp.features[0].geometry.type, key);
					}
					map.getSource(`source${key}`).setData(tmp);
				}
				if (ccc) ccc();
			} catch (e) {
				console.log(e);
			}

		}
	}
}
function createParameters(ee) {
	console.log( JSON.parse(ee).content);
	ee = JSON.parse(ee).content.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
	var eee = ee.split(",");
	var t = "";
	eee.forEach((e1) => {
		var e2 = e1.split("::");
		// console.log(e2[0]);
		// console.log(e2[1]);
		if (!("" + e2[1]).startsWith("file")) {

			parameters.set(e2[0], e2[1]);
			t += '<tr><td class="tdparam" width="150px">' + e2[0] + '</td><td  width="200px"> <input type="text" id="param_' + e2[0] + '" value="' + e2[1] + '">';
			t += '</td><td><input type="checkbox" value="1" id="use_param_' + e2[0] + '" /></td></tr>';
		}
	});
	t += '<tr><td> End Condition:</td><td> <input type="text" id="param_end_condition" value="cycle>1000"></td><td><input type="checkbox" value="1" id="use_param_end_condition" /></td></tr>';
	$("#param_div").html('<table>' + t + '</table>');

}
function createSources(ee) {
	ee = JSON.parse(ee).content.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
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
	gama.endRequest();
	geojsonMap.forEach(logMapElements);
}
function fitzoom(ee) {
	// console.log(ee);
	ee = JSON.parse(ee).content.replace(/[{}]/g, "");
	var eee = ee.split(",");
	console.log(eee[0]);
	console.log(eee[1]);
	if (eee[1]) {
		centerPoint = [eee[0], eee[1]];
		fitZoomCenter();
		if (document.getElementById('div-loader')) document.getElementById('div-loader').remove();
	}
}
function addLayer(type, key) {

	if (type === 'LineString') {
		map.addLayer({
			'id': `source${key}`,
			'type': 'line',
			'source': `source${key}`, // reference the data source
			'layout': {},
			'paint': {
				'line-color': {
					type: 'identity',
					property: 'color',
				},
			}
		});
	} else if (type === 'Point') {

		map.addLayer({
			'id': `source${key}`,
			'type': 'circle',
			'source': `source${key}`, // reference the data source
			'layout': {},
			'paint': {
				'circle-color': {
					type: 'identity',
					property: 'color',
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

				'fill-color': {
					type: 'identity',
					property: 'color',
				},
				'fill-outline-color': 'rgba(0,0,0,0)',

				// 'fill-color': '#0080ff', // blue color fill
				'fill-opacity': 0.5
			}
		});
	}

	map.on('click', `source${key}`, (e) => {
		new mapboxgl.Popup()
			.setLngLat(e.lngLat)
			.setHTML(e.features[0].properties.name)
			.addTo(map);
	});


}
map.on('load', () => {
	modelPath = ABSOLUTE_PATH_TO_GAMA + urlParams.get('m');
	experimentName = urlParams.get('e');
	if (experimentName != null && experimentName !== "") {
		gama = new GAMA("ws://localhost:6868/", modelPath, experimentName);
		// gama = new GAMA("ws://51.255.46.42:6001/", modelPath, experimentName);
		// gama.executor_speed=100;
		gama.connect(on_connected, on_disconnected);

	}
});

// map.on('style.load', () => {
// 	const waiting = () => {
// 		if (!map.isStyleLoaded()) {
// 			setTimeout(waiting, 200);
// 		} else {

// 			modelPath = urlParams.get('m');
// 			experimentName = urlParams.get('e');
// 			if (experimentName != null && experimentName !== "") {
// 				gama = new GAMA("ws://localhost:6868/", modelPath, experimentName);
// 				// gama = new GAMA("ws://51.255.46.42:6001/", modelPath, experimentName);
// 				// gama.executor_speed=100;
// 				gama.connect(on_connected, on_disconnected);

// 			}
// 		}
// 	};
// 	waiting();
// });