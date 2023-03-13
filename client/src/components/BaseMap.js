import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapGeojson from "./MapGeojson";

const BaseMap = (props) => {
  const mapContainer = useRef(null);
  const [mymap, setMap] = useState(null);

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    const initializeMap = ({ setMap, mapContainer }) => {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11", // stylesheet location
        center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position 
        zoom: 15 // starting zoom
      });

    };

    if (!mymap) initializeMap({ setMap, mapContainer });
  }, [mymap]);

  return (
    <><div ref={el => (mapContainer.current = el)} className="map">

    </div>
      <div>

        <MapGeojson props={props} map={mymap}></MapGeojson>
      </div></>
  );
};

export default BaseMap;