import React from 'react'

class MapGeojson extends React.Component {

    constructor(props) {

        super();
        this.state = {
            title: {
                text: "aaa"
            },
            sources: [
            ]
        };
        this.map = props.mmap;
        this.updateSource = null;
        this.geojson = {
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

        this.title = props.props.props.title;
        this.mapdata = props.props.props.mapbox;
        this.state.title.text = (this.title);
        let _this = this;
        // console.log( props.props.props.mapbox);
        this.mapdata.forEach((value, index, array) => {
            _this.state.sources.push({
                species: value.species,
                attr: value.attributes,
                style: value.style,
                type: value.type
            });
        }
        );
        window.$gama.addOutput(this, this);
        // console.log(window.$gama.outputs);
        setTimeout(() => {

            var myself = this;
            this.on_connected(myself);
        }, 20);

    }



    on_connected(myself) {
        // const attribute1Name = this.state.sources[0].attr;
        // const attribute2Name = 'zone_id';
        // console.log("connected");
        // console.log(this.props.map);
        var mymyself = myself;
        this.props.map.current.on('load', async () => {
            // Add the source1 location as a source.
            this.state.sources.forEach((v) => {
                this.props.map.current.addSource("S" + v.species, {
                    type: 'geojson',
                    data: mymyself.geojson
                });

                var circle_defaultstyle = {
                    'circle-radius': {
                        'base': 1,
                        'stops': [
                            [12, 5],
                            [22, 10]
                        ]
                    },
                    'circle-color': ['match', ['get', v.attr], // get the property
                        "susceptible", 'green',
                        "latent", 'orange',
                        "presymptomatic", 'red',
                        "asymptomatic", 'red',
                        "symptomatic", 'red',
                        "removed", 'blue',
                        'gray'],

                };
                var fill_defaultstyle = { 
                    'fill-outline-color': "black",
                    'fill-color': ['get', v.attr]
                    };
                var line_defaultstyle = { 
                    'line-color': ['get', v.attr]
                    };
                var defaultstyle = v.type==='line'?line_defaultstyle:(v.type==="fill"?fill_defaultstyle:(circle_defaultstyle));
                this.props.map.current.addLayer({
                    'id': "S" + v.species,
                    type: v.type ? (v.type) : 'circle',
                    'source': "S" + v.species,
                    'layout': {},
                    'paint': v.style ? JSON.parse(v.style) : defaultstyle,
                });
            });
            // this.props.map.current.addSource('source1', {
            //     type: 'geojson',
            //     data: mymyself.geojson
            // }); 
            // this.props.map.current.addLayer({
            //     'id': 'source2',
            //     type: 'fill',
            //     'source': 'source2',
            //     'layout': {},
            //     'paint': {
            //         'fill-color': ['match', ['get', attribute2Name], // get the property
            //             "commerce", 'green',
            //             "gare", 'red', "Musee", 'red',
            //             "habitat", 'blue', "culte", 'blue', "Industrial", 'blue',
            //             'gray'],

            //     },
            // });
            // myself.start_renderer();
        });

        // window.$gama.evalExpr("species(world).microspecies", function (ee) {
        //     console.log(ee);
        // });
        window.$gama.evalExpr("CRS_transform(world.location,\"EPSG:4326\")", function (ee) {
            // console.log(ee);
            if (JSON.parse(ee).type === "CommandExecutedSuccessfully") {
                ee = JSON.parse(ee).content.replace(/[{}]/g, "");
                var eee = ee.split(",");
                console.log(eee[0]);
                console.log(eee[1]);
                myself.props.map.current.flyTo({
                    center: [eee[0], eee[1]],
                    essential: true,
                    duration: 0,
                    zoom: 15
                });
                // document.getElementById('div-loader').remove();
                // window.$gama.request = "";//IMPORTANT FLAG TO ACCOMPLISH CURRENT TRANSACTION
            }
        });

    }

    on_disconnected() {
        console.log("disconnected");
    }

    componentWillUnmount() {

        window.$gama.outputs.delete(this);
        // console.log(window.$gama.outputs);
    }
    reset(c) {

    }
    update(c) {
        // const species1Name = 'Individual';
        // const attribute1Name = 'state';
        var myself = this;

        // .getPopulation(species1Name, [attribute1Name], 

        this.state.sources.forEach((v) => {
            this.singleUpdate(myself, v.species, v.attr, c);
        });
    }
    singleUpdate(myself, species1Name, attribute1Name, c) {
        window.$gama.evalExpr("to_geojson(" + species1Name + ",\"EPSG:4326\",[\"" + attribute1Name + "\"])", function (message) {
            if (typeof message.data == "object") {

            } else {
                var gjs ;
                try{
                    gjs = JSON.parse(message);
                }catch(exce){
                    console.log(message);
                }
                if (gjs && gjs.content && gjs.type === "CommandExecutedSuccessfully") {
                    var tmp = gjs.content;
                    myself.geojson = null;

                    myself.geojson = tmp;
                    if (myself.props.map.current.getSource("S" + species1Name))
                        myself.props.map.current.getSource("S" + species1Name).setData(myself.geojson);
                }

            }
            if (c) {
                c();
                // console.log("callback mapgeojson");
                // if(!JSON.parse(message).command){console.log(JSON.parse(message));}
            }
        }, true);
    }
    // start_renderer() {

    //     const species2Name = 'Building';
    //     const attribute2Name = 'zone_id';

    //     // const species1Name = 'people';
    //     // const attribute1Name = 'name'; 
    //     // const species2Name = 'building';
    //     // const attribute2Name = 'name';

    //     var myself = this;
    //     // window.$gama.getPopulation(species2Name, [attribute2Name], "EPSG:4326", function (message) {
    //     window.$gama.evalExpr("to_geojson(" + species2Name + ",\"EPSG:4326\",[\"" + attribute2Name  + "\"])", function (message) {
    //         if (typeof message.data == "object") {

    //         } else {
    //             try {
    //                 myself.geojson = null;
    //                 // myself.geojson = JSON.parse(message).content;

    //                 // console.log(myself.geojson);
    //                 myself.props.map.current.getSource('source2').setData(myself.geojson);
    //                 // console.log(ls);
    //             } catch (e) {
    //                 console.log(e);
    //             }
    //         }
    //     }, true);

    //     // this.updateSource = setInterval(() => {
    //     // }, 1000);
    // }


    render() {


        return "";
    }
}

export default MapGeojson;