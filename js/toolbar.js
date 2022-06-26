

/* Event Handlers */
function play(event) {
	gama.play(start_renderer);
}
function pause(event) {
	gama.pause(stop_renderer);
}

function doStep(event) {
	gama.step(function (e) { geojsonMap.forEach(logMapElements); });

}

function reload(event) {
	var pp = [];
	parameters.forEach((value, key, map) => {
		if ($('#use_param_' + key).prop('checked')) {
			pp.push({ "name": "" + key, "value": $('#param_' + key).val(), "type": "int" });
		} 
	})
	gama.setParameters(pp);
	// gama.setParameters([
	// 	{ "name": "nb_people", "value":  $('#p_1').val(), "type": "int" }
	// ]);
	// gama.setEndCondition( $('#p_end_condition').val());
	gama.reload(function (e) {
		gama.endRequest();
		geojsonMap.forEach(logMapElements);
	});
}

const createButton = (text, onclick) => {
	const button = document.createElement('button');
	button.setAttribute('type', 'button');
	button.appendChild(document.createTextNode(text));
	button.addEventListener('click', onclick);
	return button;
};
const createPanel = (text, onclick) => {
	const button = document.createElement('button');
	button.setAttribute('type', 'button');
	button.appendChild(document.createTextNode(text));
	button.addEventListener('click', onclick);
	return button;
};
const fitZoomButton = createButton('[-]', fitZoomCenter);
const playButton = createButton('Play', play);
const pauseButton = createButton('Pause', pause);
const stepButton = createButton('Step', doStep);
const reloadButton = createButton('Reload', reload);

let lat, lng;
const updateLatLon = (ev) => {
	let currentCenter = map.getCenter();
	// lat.textContent = currentCenter.lat.toFixed(6);
	// lng.textContent = currentCenter.lng.toFixed(6);
};
const mapboxglLatLngControl = {
	onAdd: (map) => {
		const latLonContainer = document.createElement('div');
		latLonContainer.classList.add('lat-lng', 'custom-control', 'mapboxgl-ctrl');
		latLonContainer.classList.add('lat-lng');
		latLonContainer.classList.add('custom-control');
		// latLonContainer.textContent = 'Centre: ';
		// lat = latLonContainer.appendChild(document.createElement('span'));
		// latLonContainer.appendChild(document.createTextNode(','));
		// lng = latLonContainer.appendChild(document.createElement('span'));
		latLonContainer.appendChild(fitZoomButton);
		latLonContainer.appendChild(playButton);
		latLonContainer.appendChild(pauseButton);
		latLonContainer.appendChild(stepButton);
		latLonContainer.appendChild(reloadButton);
		map.on('moveend', updateLatLon);
		updateLatLon();
		return latLonContainer;
	},
	getDefaultPosition: () => {
		return 'top-left'
	},
	onRemove: () => {
		map.off('moveend', updateLatLon);
	}
};