import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
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
  const [timer, setTimer] = useState(null);
  const [sources] = useState([]);

  const {
    codeFontSize
  } = props;
  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    const initializeMap = ({ setMap, mapContainer }) => {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        attributionControl: false,
        style: "mapbox://styles/mapbox/streets-v11", // stylesheet location
        center: [105.8249019, 21.0076181], // TLU -84.5, 38.05starting position 
        zoom: 15 // starting zoom
      });
      map.addControl(new mapboxgl.FullscreenControl(), 'bottom-right');
      setMap(map);
      map.on('load', async () => {


        const layers = document.getElementById('menu'); 
        layers.innerHTML='';
        props.gama.current.evalExpr("species(world).microspecies", (ee) => createSources(ee, map));



      });
      // After the last frame rendered before the map enters an "idle" state.
      map.on('idle', () => {
        let toggleableLayerIds = [ ];
        sources.forEach((v) => {
          if (!map.getLayer("S" + v.species)) {
            return;
          }
          toggleableLayerIds.push("S" +v.species);
        }); 

        // Enumerate ids of the layers.
        // Set up the corresponding toggle button for each layer.
        for (const id of toggleableLayerIds) {
          // Skip layers that already have a button set up.
          if (document.getElementById(id)) {
            continue;
          }

          // Create a link.
          const link = document.createElement('a');
          link.id = id;
          link.href = '#';
          link.textContent = id;
          link.className = 'active';

          // Show or hide layer when the toggle is clicked.
          link.onclick = function (e) {
            const clickedLayer = this.textContent;
            e.preventDefault();
            e.stopPropagation();

            const visibility = map.getLayoutProperty(
              clickedLayer,
              'visibility'
            );

            // Toggle layer visibility by changing the layout object's visibility property.
            if (visibility === 'visible') {
              map.setLayoutProperty(clickedLayer, 'visibility', 'none');
              this.className = '';
            } else {
              this.className = 'active';
              map.setLayoutProperty(
                clickedLayer,
                'visibility',
                'visible'
              );
            }
          };

          const layers = document.getElementById('menu'); 
          layers.appendChild(link);
        }
      });
    };

    if (!mymap) initializeMap({ setMap, mapContainer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mymap]);

  React.useEffect(() => {
    clearInterval(timer);
    const interval = setInterval(() => update(), codeFontSize);
    setTimer(interval);
    return () => {
      // console.log("clear "+interval);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFontSize]);

  useEffect(() => {
    const interval = setInterval(() => update(), codeFontSize);
    setTimer(interval);

    return () => {
      // console.log("clear "+interval);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mymap]);
  const createSources = (ee, mmap) => {
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
      mmap.addSource("S" + v.species, {
        type: 'geojson',
        data: tmp_geojson
      });
    });

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
        // mmap.setMaxBounds(bbox);
        mmap.fitBounds(bbox, {
          padding: 10,
          duration: 0,
        });
        sources.forEach((v) => {
          singleUpdate(mmap, v.species, v.attr);
        });

      }
    });
    // if (mymap)  {
    //   update();}
    // console.log(sources);
    // props.gama.current.addOutput(this, this);
    // this.on_connected(this);
  }

  // const on_connected = (myself) => {
  //   // const attribute1Name = this.state.sources[0].attr;
  //   // const attribute2Name = 'zone_id';
  //   // console.log("connected");
  //   // console.log(this.props.map);
  //   var mymyself = myself;


  //   // props.gama.current.evalExpr("species(world).microspecies", function (ee) {
  //   //     console.log(ee);
  //   // });




  // }

  // const on_disconnected = () => {
  //   console.log("disconnected");
  // }

  // const componentWillUnmount = () => {
  //   // console.log("componentWillUnmount");
  //   sources = [];
  //   // props.gama.current.outputs.delete(this); 
  //   props.gama.current.outputs.clear();
  //   // console.log(props.gama.current.outputs);
  // }
  // const reset = (c) => {

  // }

  const update = (force, c) => {
    if (mymap && (props.gama.current.status === "play" || props.gama.current.status === "step" || force)) {
      sources.forEach((v) => {
        singleUpdate(mymap, v.species, v.attr, c);
      });
    }
  }

  const singleUpdate = (mymap, species1Name, attribute1Name, c) => {
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

          // console.log(species1Name);
          // console.log(message);

          if (!mymap.style.getLayer("S" + species1Name)) {
            // addLayer(tmp.features[0].geometry.type, key);

            var circle_defaultstyle = {
              'circle-radius': 5,
              'circle-opacity':0.5,
              'circle-color': ["case", ["==", ["get", attribute1Name], null], 'black', ['get', attribute1Name]]

            };
            var fill_defaultstyle = {
              'fill-outline-color': "black",
              'fill-opacity':0.5,
              'fill-color': ["case", ["==", ["get", attribute1Name], null], 'black', ['get', attribute1Name]]
            };
            var line_defaultstyle = {
              'line-opacity':0.5,
              'line-color': ["case", ["==", ["get", attribute1Name], null], 'black', ['get', attribute1Name]]
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
              // 'filter':  ['has','color']
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
    <nav id="menu"></nav>
      {/* <div>

        <MapGeojson map={mymap}></MapGeojson>
      </div> */}
    </>
  );
};

export default BaseMap;