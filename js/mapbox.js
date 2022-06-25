mapboxgl.accessToken = 'pk.eyJ1IjoiaHFuZ2hpODgiLCJhIjoiY2t0N2w0cGZ6MHRjNTJ2bnJtYm5vcDB0YyJ9.oTjisOggN28UFY8q1hiAug';
var centerPoint=  [105.8249019, 21.0076181];
var bbox;
const map = new mapboxgl.Map({
	container: 'map', // container id
	// style: 'mapbox://styles/mapbox/dark-v10',
	// style: {version: 8,sources: {},layers: []},

	// pitch: 45,
	// bearing: -17.6,
	antialias: true,
	center:centerPoint, // TLU -84.5, 38.05starting position  [6.069437036914885,45.09389334701125],//
	zoom: 13 // starting zoom
});
 
function fitZoomCenter(){
	map.flyTo({
		center: centerPoint,
		duration: 0,
		zoom: 10
	});
	if(bbox){
		map.fitBounds(bbox, {padding: 50});
	}
}