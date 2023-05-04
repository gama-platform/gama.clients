
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
    executor_speed = 1;
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
        this.wSocket.addEventListener('open', () => {
            this.wSocket.onmessage = (event) => {
                this.executor = setInterval(() => {
                    if (this.queue.length > 0 && this.req === "") {
                        // console.log(this.queue);
                        this.req = this.queue.shift();
                        this.req.exp_id = this.exp_id;
                        this.req.socket_id = this.socket_id;
                        // console.log(this.req);
                        this.wSocket.send(JSON.stringify(this.req));
                        // console.log("request " + JSON.stringify(this.req));
                        if (this.logger) { this.logger("request " + JSON.stringify(this.req)); }
                        var myself = this;
                        this.wSocket.onmessage = function (event) {
                            // console.log(event.data);
                            if (typeof event.data != "object") {
                                if (myself.req.callback) {
                                    myself.req.callback(event.data,
                                        myself.endRequest());
                                } else {
                                    myself.endRequest();
                                }
                            }
                        };
                    }

                }, this.executor_speed);
                if (opened_callback) opened_callback(event);
            };
        });
    }

    requestCommand(cmd) {
        if (this.req === "" || this.queue.length == 0) {
            this.queue.push(cmd);
        }
    }
    endRequest() {
        // console.log("end response of "+ this.req.type);
        this.req = "";
    }

    evalExpr(q, c, es) {
        var cmd = {
            "type": "expression",
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "escaped": es ? es : false,
            "expr": q,
            "callback": c
        };
        this.requestCommand(cmd);
    }
    execute(q, c) {
        var cmd = {
            "type": q,
            "model": this.modelPath,
            "experiment": this.experimentName,
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
            "console": false,
            "status": false,
            "dialog": false,
            "auto-export": false,
            "parameters": this.param,
            "until": this.endCondition,
            "sync": true,
            "callback": c
        };
        this.requestCommand(cmd);
    }
    getPopulation(q, att, crs, c) {
        var cmd = {
            'type': 'expression',
            "model": this.modelPath,
            "experiment": this.experimentName,
            'socket_id': this.socket_id,
            'exp_id': this.exp_id,
            'species': q,
            'attributes': att,
            "crs": crs,
            "sync": true,
            "callback": c
        };
        this.requestCommand(cmd);
    }

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
            console.log(result);
            // if(result.type==="CommandExecutedSuccessfully"){
            if (result.type === "CommandExecutedSuccessfully" && result.content) myself.exp_id = result.content;
            if (c) {
                c(result);
            }
            // }
        });
    }
    play(c) {
        // this.queue.length = 0;
        this.state = "play";
        this.execute(this.state, c);
    }

    pause(c) {
        // this.queue.length = 0;
        this.state = "pause";
        this.execute(this.state, c);
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