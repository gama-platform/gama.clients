
class GAMA {
    host = "";
    modelPath = 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
    experimentName = 'road_traffic';


    socket_id = 0;
    exp_id = 0;
    wSocket;
    state = "";
    queue = [];
    req = "";
    result = "";
    executor;
    executor_speed = 5;
    endCondition = "";
    param = [];
    logger;
    constructor(address, md, exp) {
        this.host = address;
        this.modelPath = md;
        this.experimentName = exp;
    }
    connect(opened_callback, closed_callback) {

        this.wSocket = new WebSocket(this.host);

        this.wSocket.onclose = function (event) {
            clearInterval(this.executor);
            if (closed_callback) closed_callback();
        };
        this.wSocket.onerror = function (event) {
            console.log("Error: " + event.message);
        }
        this.req=  { 
            "type": "connecting", 
            "callback": opened_callback
        };

        // this.wSocket.onmessage = function (e) {
        //     // console.log(event); 
        //     var result = JSON.parse(e.data).content;
        //     if (result) _this.socket_id = result;
        // };



        var myself = this;
        this.wSocket.onmessage = function (event) {
            // console.log(event);

            // if (this.logger) {
            //     this.logger("response " + (event.data));
            // }
            if (myself.req !== "") {
                // console.log("onmessage "+myself.req);
                // console.log(event.data);
                if (event.data instanceof Blob) { } else {
                    if (myself.req.callback) {
                        myself.req.callback(event.data);
                    }
                    myself.endRequest();
                }
            }
        };

        this.wSocket.onopen = function (event) {
            // if (opened_callback) opened_callback();
            myself.initExecutor();
        };


        // this.wSocket.addEventListener('open', () => {
        //     this.wSocket.onmessage = (event) => {
        //     };
        // });
    }
    initExecutor() {
        var myself = this;
        this.executor = setInterval(() => {
            // console.log("queue "+this.queue);
            if (this.queue.length > 0 && this.req === "") {
                this.req = this.queue.shift();
                this.req.exp_id = this.exp_id;
                this.req.socket_id = this.socket_id;
                console.log(this.req);
                this.wSocket.send(JSON.stringify(this.req)); // console.log("request " + JSON.stringify(this.req));

                // if (this.logger) {
                //     this.logger("request " + JSON.stringify(this.req));
                // }

            }
        }, this.executor_speed);
    }
    requestCommand(cmd) {
        // if (this.req === "" || this.queue.length === 0) {
            this.queue.push(cmd);
        // }
    }
    endRequest() {
        // console.log("end response of "+ this.req.type);
        this.req = "";
    }

    evalExpr(q, c, es) {
        // var cmd = {
        //     "type": "expression",
        //     "socket_id": this.socket_id,
        //     "exp_id": this.exp_id,
        //     "escaped": es ? es : false,
        //     "expr": q,
        //     "callback": c
        // };  
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
        this.requestCommand(cmd);
    }
    execute(q, c) {
        // var cmd = {
        //     "type": q,
        //     "model": this.modelPath,
        //     "experiment": this.experimentName,
        //     "socket_id": this.socket_id,
        //     "exp_id": this.exp_id,
        //     "console": false,
        //     "status": false,
        //     "dialog": false,
        //     "auto-export": false,
        //     "parameters": this.param,
        //     "until": this.endCondition,
        //     "sync": true,
        //     "callback": c
        // };

        var cmd = {
            // "atimestamp": Math.floor(Math.random() * Date.now()).toString(16),
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
            "sync": true,
            "callback": c
        };
        this.requestCommand(cmd);
    }
    // getPopulation(q, att, crs, c) {
    //     var cmd = {
    //         'type': 'expression',
    //         "model": this.modelPath,
    //         "experiment": this.experimentName,
    //         'socket_id': this.socket_id,
    //         'exp_id': this.exp_id,
    //         'species': q,
    //         'attributes': att,
    //         "crs": crs,
    //         "sync": true,
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
        // clearInterval(this.output_executor);
        // this.queue.length = 0;
        this.state = "play";
        // console.log("play");
        this.execute(this.state, c);
    }

    pause(c) {
        //     // this.queue.length = 0;
        //     this.state = "pause";
        //     this.execute(this.state, c);

        this.queue.length = 0;
        clearInterval(this.output_executor);
        this.status = "pause";
        this.execute(this.status, () => {
            if (c) c();
        });
    }

    step(c) {
        // this.queue.length = 0;
        this.state = "step";
        this.execute(this.state, c);
    }


    reload(c) {
        // this.queue.length = 0;
        this.state = "reload";
        this.execute(this.state, c);
        // if (c) c();
    }

} 