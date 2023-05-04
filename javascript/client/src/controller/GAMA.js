import React from 'react'
// // eslint-disable-next-line import/no-webpack-loader-syntax
// import certtext from '!!raw-loader!./cert.pem';
// // eslint-disable-next-line import/no-webpack-loader-syntax
// import keytext from '!!raw-loader!./key.pem';

class GAMA extends React.Component {
    constructor() {

        super(); 
        this.socket_id = 0;
        this.exp_id = 0;
        this.wSocket = void 0;
        this.status = "";
        this.queue = [];
        this.req = "";
        this.result = "";
        this.executor = void 0;
        this.output_executor = void 0;
        this.executor_speed = 10;
        this.endCondition = "";
        this.param = [];
        this.outputs = new Map();
        this.logger = void 0;
        this.address = "";
        this.rootPath = "";
        this.modelPath = "";
        this.pendingoutput = 0;
        this.experimentName = "";
        // this.map = mmap;
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
        this.editor=null;
        window.$gama = this;
        // this.connect(this.on_connected, this.on_disconnected);

        // this.tryLaunch = this.tryLaunch.bind(this);
        // this.tryGenParam = this.tryGenParam.bind(this);

    }
    setGrid(g){
        this.grid=g;
    }
    // doConnect(c, dc) {
    //     this.connect(c, dc);
    // }
    connect(a, rp, opened_callback, closed_callback) {
        this.address = a;
        this.rootPath = rp;
        // this.modelPath = m;
        // this.experimentName = e;
        // this.map = this.address.map;
        // console.log(keytext);
        this.wSocket = new WebSocket(this.address);
        // this.wSocket = new WebSocket(this.address.address, [], {
        //     cert: certtext,
        //     key: keytext,
        //     protocolVersion: 8,
        //     origin: 'https://localhost:6868',
        //     rejectUnauthorized: false
        // });

        var myself = this;
        this.wSocket.onclose = function (event) {
            clearInterval(myself.executor);


            myself.wSocket = null;
            if (closed_callback) closed_callback(myself);
        };

        var _this = this;

        this.wSocket.onmessage = function (e) {
            // console.log(event); 
            var result = JSON.parse(e.data).content;
            if (result) _this.socket_id = result;
        };
        this.wSocket.onopen = function (event) {
            if (opened_callback) opened_callback(_this);
            _this.initExecutor();
        };

    }
    initExecutor() {

        this.executor = setInterval(() => {
            if (this.queue.length > 0 && this.req === "") {
                this.req = this.queue.shift();
                this.req.exp_id = this.exp_id;
                this.req.socket_id = this.socket_id;
                // console.log(this.req);
                this.wSocket.send(JSON.stringify(this.req)); // console.log("request " + JSON.stringify(this.req));

                if (this.logger) {
                    this.logger("request " + JSON.stringify(this.req));
                }

                var myself = this;

                this.wSocket.onmessage = function (event) {
                    // console.log(event);
                    if (myself.req !== "") {
                        // console.log(myself.req);
                        if (event.data instanceof Blob) { } else {
                            if (myself.req.callback) {
                                myself.req.callback(event.data);
                            }
                            myself.endRequest();
                        }
                    }
                };
            }
        }, this.executor_speed);
    }
    // on_connected(c) {
    //     console.log("connected");
    //     if (c) c();
    // }

    // on_disconnected() {
    //     console.log("disconnected");
    // }



    requestCommand(cmd) {
        if (this.req === "" || this.queue.length === 0) {
            this.queue.push(cmd);
        }
    }

    endRequest() {
        this.req = "";
        // console.log("end request");
    }

    evalExpr(q, c, es) {
        // console.log(q);
        var cmd = {
            // "atimestamp": Math.floor(Math.random() * Date.now()).toString(16),
            "type": "expression",
            "model": this.modelPath,
            "experiment": this.experimentName,
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "console": false,
            "status": false,
            "dialog": false,
            "runtime": false,
            "escaped": es ? es : false,
            "sync": true,
            "expr": q,
            "callback": c
        };
        // console.log("eval " + cmd.expr);
        this.requestCommand(cmd);
    }
    
    push(f,cnt, c, es) {
        this.modelPath=f;
        var cmd = {
            // "atimestamp": Math.floor(Math.random() * Date.now()).toString(16),
            "type": "fetch",
            "access":"up",
            "content":cnt,
            "model": this.modelPath,
            "experiment": this.experimentName,
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "console": false,
            "status": false,
            "dialog": false,
            "escaped": es ? es : false,
            "sync": true,
            "file": f,
            "callback": c
        };
        // console.log("eval " + cmd.expr);
        this.requestCommand(cmd);
    }
    fetch(f, c, es) {        
        this.modelPath=f;
        var cmd = {
            // "atimestamp": Math.floor(Math.random() * Date.now()).toString(16),
            "type": "fetch",
            "access":"down",
            "model": this.modelPath,
            "experiment": this.experimentName,
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "console": false,
            "status": false,
            "dialog": false,
            "escaped": es ? es : false,
            "sync": true,
            "file": f,
            "callback": c
        };
        // console.log("eval " + cmd.expr);
        this.requestCommand(cmd);
    }

    execute(q, c) {
        var cmd = {
            "atimestamp": Math.floor(Math.random() * Date.now()).toString(16),
            "type": q,
            "model": this.modelPath,
            "experiment": this.experimentName,
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "console": false,
            "status": false,
            "dialog": false,
            "runtime": false,
            "auto-export": false,
            "parameters": this.param,
            "until": this.endCondition,
            "sync": true,
            "callback": c
        };
        this.requestCommand(cmd);
    }

    // getPopulation(q, att, crs, c) {
    //     var cmd = {
    //         'type': 'output',
    //         'species': q,
    //         'attributes': att,
    //         "crs": crs,
    //         'socket_id': this.socket_id,
    //         'exp_id': this.exp_id,
    //         "callback": c
    //     };
    //     this.requestCommand(cmd);
    // }

    setParameters(p) {
        this.param = p;
    }

    setEndCondition(ec) {
        this.endCondition = ec;
    }

    launch(c) {
        this.queue.length = 0;
        var myself = this;
        this.status = "load";
        this.execute(this.status, function (e) {

            var result = JSON.parse(e);
            // console.log(result);
            // if(result.type==="CommandExecutedSuccessfully"){
            if (result.type === "CommandExecutedSuccessfully" && result.content) myself.exp_id = result.content;
            if (c) {
                c(result);
            }
            // }
        });
    }

    play(c) {
        clearInterval(this.output_executor);

        // this.queue.length = 0;
        this.status = "play";
        this.execute(this.status, c);
        // this.output_executor = setInterval(() => {
        //     this.updateOutputs();
        // }, 10);
    }
    resetOutputs() {
        this.pendingoutput = 0;
        this.outputs.forEach((values, keys) => {
            values.reset();
        });
    }
    updateOutputs() {

        // let _this = this;
        // if (this.pendingoutput <= 0) {
        //     this.pendingoutput = this.outputs.size;
        //     this.outputs.forEach((values, keys) => {
        //         // console.log(values);
        //         values.update(function () { _this.pendingoutput-- });
        //     });
        // }
    }

    autoStep(c) {
        // this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "step";
        this.execute(this.status, () => {
            this.output_executor = setInterval(() => {
                this.updateOutputs();
                if (c) c();
                this.autoStep(c);
            }, 100);
        });
    }

    step(c) {
        // this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "step";
        this.execute(this.status, () => {
            if (c) c();
            this.status = "";
            this.updateOutputs();
        });
    }
    pause(c) {
        this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "pause";
        this.execute(this.status, () => {
            if (c) c();
        });
    }
    // serial(asyncFunctions) {
    //     return asyncFunctions.map(function (functionChain, nextFunction) {
    //         return functionChain
    //             .then((previousResult) => nextFunction(previousResult))
    //             .then(result => ({ status: 'fulfilled', result }))
    //             .catch(error => ({ status: 'rejected', error }));
    //     }, Promise.resolve());
    // }

    reload(c) {
        // this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "reload";
        this.execute(this.status, () => {
            if (c) c();
            this.resetOutputs();
        });
    }

    stop(c) {
        this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "stop";
        this.execute(this.status, () => {
            if (c) c();
        });
    }
    addOutput(id, o) {
        this.outputs.set(id, o);
    }
    componentWillUnmount() {
        clearInterval(this.executor);
        clearInterval(this.output_executor);
        // this.wSocket.close();
    }
    render() {


        return "";
    }

    // tryLoad() {
    //   this.fileUploadInput.current.click();
    // }
    // trySave() {
    //   getLocalstorageToFile("layout.txt");
    // }
    tryAdd() {
        this.props.grid.current.addWidget();
    }
    tryExperiment() {
        this.props.grid.current.addExperiment();
    }
    tryEdit() {
        this.props.grid.current.toggleEdit();
    }
}

export default GAMA;