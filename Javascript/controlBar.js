

/* Event Handlers */
function play(event) {
	// console.log("event number 1", event);
	cmd = {
		"type": "play",
		"socket_id": socket_id,
		"exp_id": exp_id
	};
	queue.push(cmd);
}

function pause(event) {
	// console.log("event number 2", event);
	cmd = {
		"type": "pause",
		"socket_id": socket_id,
		"exp_id": exp_id
	};
	queue.push(cmd);
}

function step(event) {
	// console.log("event number 3", event);
	cmd = {
		"type": "step",
		"socket_id": socket_id,
		"exp_id": exp_id
	};
	queue.push(cmd);
}

function reload(event) {
	// console.log("event number 4", event);
	cmd = {
		"type": "reload",
		"socket_id": socket_id,
		"exp_id": exp_id
	};
	queue.push(cmd);
}

const createButton = (text, onclick) => {
	const button = document.createElement('button');
	button.setAttribute('type', 'button');
	button.appendChild(document.createTextNode(text));
	button.addEventListener('click', onclick);
	return button;
};
const playButton = createButton('Play', play);
const pauseButton = createButton('Pause', pause);
const stepButton = createButton('Step', step);
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
map.addControl(mapboxglLatLngControl);