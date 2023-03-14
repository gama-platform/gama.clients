import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapGeojson from "./MapGeojson";
const tmp_geojson = {
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
const BaseMap = (props) => {
  const mapContainer = useRef(null);
  const [mymap, setMap] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    const initializeMap = ({ setMap, mapContainer }) => {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11", // stylesheet location
        center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position 
        zoom: 15 // starting zoom
      });
      setMap(map);
      map.on('load', async () => {

        props.gama.current.evalExpr("species(world).microspecies", (ee) => createSources(ee, map));
        props.gama.current.evalExpr("\"\"+CRS_transform(world.shape.points[1],\"EPSG:4326\")+\",\"+CRS_transform(world.shape.points[3],\"EPSG:4326\")", function (ee) {
          // console.log(ee);
          if (JSON.parse(ee).type === "CommandExecutedSuccessfully") {
            // ee = JSON.parse(ee).content.replace(/[{}]/g, "");
            ee = JSON.parse(ee).content.replace(/[{}]/g, "").replace(/['"]+/g, '');
            var eee = ee.split(",");
            const bbox = [
              [eee[0], eee[1]], // southwestern corner of the bounds
              [eee[3], eee[4]], // northeastern corner of the bounds
            ];
            map.fitBounds(bbox, {
              padding: 10,
              duration: 0,
            });
          }
        });


      });
    };

    if (!mymap) initializeMap({ setMap, mapContainer }); 
  }, [mymap]);
  useEffect(() => {
    if (mymap)  {
    
      const interval = setInterval(() => update(),100);
      return () => {
        clearInterval(interval);
      };
    }
  }, [mymap]);
  const createSources = (ee, mymap) => {
    ee = JSON.parse(ee).content.replace(/[\])}[{(]/g, '').replace(/['"]+/g, '');
    var eee = ee.split(",");
    eee.forEach((e) => {
      sources.push({
        species: e.trim(),
        attr: "color",
        style: "",
        type: "fill"
      });
      // geojsonMap.set(e, {
      //     'type': 'FeatureCollection',
      //     'features': [
      //         {
      //             'type': 'Feature',
      //             'geometry': {
      //                 'type': 'Point',
      //                 'coordinates': [0, 0]
      //             }
      //         }
      //     ]
      // });
      // map.addSource(`source${e}`, {
      //     type: 'geojson',
      //     data: geojsonMap.get(e)
      // });
    });
    sources.forEach((v) => {
      mymap.addSource("S" + v.species, {
        type: 'geojson',
        data: tmp_geojson
      });
    });

    // console.log(sources);
    // props.gama.current.addOutput(this, this);
    // this.on_connected(this);
  }

  const on_connected = (myself) => {
    // const attribute1Name = this.state.sources[0].attr;
    // const attribute2Name = 'zone_id';
    // console.log("connected");
    // console.log(this.props.map);
    var mymyself = myself;


    // props.gama.current.evalExpr("species(world).microspecies", function (ee) {
    //     console.log(ee);
    // });




  }

  const on_disconnected = () => {
    console.log("disconnected");
  }

  const componentWillUnmount = () => {
    // console.log("componentWillUnmount");
    sources = [];
    // props.gama.current.outputs.delete(this); 
    props.gama.current.outputs.clear();
    // console.log(props.gama.current.outputs);
  }
  const reset = (c) => {

  }
  const update = (c) => { 
    sources.forEach((v) => {
      singleUpdate( v.species, v.attr, c);
    });
  }

  const singleUpdate = (species1Name, attribute1Name, c) => {
    props.gama.current.evalExpr("to_geojson(" + species1Name + ",\"EPSG:4326\",[\"" + attribute1Name + "\"])", function (message) {
      if (typeof message.data == "object") {

      } else {
        var gjs;
        try {
          gjs = JSON.parse(message);
        } catch (exce) {
          console.log(message);
        }
        if (gjs && gjs.content && gjs.type === "CommandExecutedSuccessfully") {
          var tmp = gjs.content; 
 

          if (!mymap.style.getLayer("S" + species1Name)) {
            // console.log("layer added");
            // addLayer(tmp.features[0].geometry.type, key);

            var circle_defaultstyle = {
              'circle-radius': 5,
              'circle-color': ['get', attribute1Name],

            };
            var fill_defaultstyle = {
              'fill-outline-color': "black",
              'fill-color': ['get', attribute1Name]
            };
            var line_defaultstyle = {
              'line-color': ['get', attribute1Name]
            };
            var gtype = tmp.features[0].geometry.type;
            gtype = (gtype === 'LineString' ? 'line' : (gtype === 'Point' ? 'circle' : ('fill')));
            var defaultstyle = gtype === 'line' ? line_defaultstyle : (gtype === "fill" ? fill_defaultstyle : (circle_defaultstyle));

            mymap.addLayer({
              'id': "S" + species1Name,
              type: gtype,
              'source': "S" + species1Name,
              'layout': {},
              'paint': defaultstyle,
            });
          }
          if (mymap.getSource("S" + species1Name))
            mymap.getSource("S" + species1Name).setData(tmp);
        }

      }
      if (c) {
        c();
        // console.log("callback mapgeojson");
        // if(!JSON.parse(message).command){console.log(JSON.parse(message));}
      }
    }, true);
  }

  return (
    <>
      <div ref={el => (mapContainer.current = el)} className="map">

      </div>
      {/* <div>

        <MapGeojson map={mymap}></MapGeojson>
      </div> */}
    </>
  );
};

export default BaseMap;