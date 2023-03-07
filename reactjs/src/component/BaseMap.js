import React, { useEffect, useRef } from "react";
import mapboxgl from '!mapbox-gl';  
import MapGeojson from "./MapGeojson";

const BaseMap = (props) => {
  mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  // console.log(props.parent);
  const mymap = useRef(null);

  useEffect(() => { 
    mymap.current = new mapboxgl.Map({
      container: props.parent.id,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      // pitch: 45,
      // bearing: -17.6,
      antialias: false,
      center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position 
      zoom: 15 // starting zoom
    }); 
  }, [mymap]); 
  
  return (
    <><div id={props.parent.id} className="map">

    </div>
      <div>

        <MapGeojson props={props} map={mymap}></MapGeojson>
      </div></>
  );
};

export default BaseMap;