class GAMA {
    host = "";
    modelPath = 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
    experimentName = 'road_traffic';


    socket_id = 0;
    exp_id = 0;
    wSocket;
    queue = [];
    req = "";
    result = "";
    executor_speed = 1;
    opened_callback;
    constructor(address, md, exp, cb) {
        this.host = address;
        this.modelPath = md;
        this.experimentName = exp;
        this.opened_callback = cb;
    }
    init() {

        this.wSocket = new WebSocket(this.host);

        this.wSocket.onclose = function (event) {
            clearInterval(this.executor);
        };
        this.wSocket.addEventListener('open', (event) => {
            this.opened_callback();
        });
        this.executor = setInterval(() => {
            if (this.queue.length > 0 && this.req === "") {
                this.req = this.queue.shift();
                this.req.exp_id = this.exp_id;
                this.req.socket_id = this.socket_id;
                this.wSocket.send(JSON.stringify(this.req));
                // console.log("request " + JSON.stringify(this.req));
                var myself = this;
                this.wSocket.onmessage = function (event) {
                    // console.log(myself.req);
                    if (event.data instanceof Blob) { } else {
                        if (myself.req.callback) {
                            myself.req.callback(event.data);
                        }
                        myself.endRequest();
                    }
                };
            }

        }, this.executor_speed);
    }

    requestCommand(cmd) {
        this.queue.push(cmd);
    }
    endRequest() {
        this.req = "";
    }

    evalExpr(q, c) {
        var cmd = {
            "type": "expression",
            "socket_id": this.socket_id,
            "exp_id": this.exp_id,
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
            "auto-export": false,
            "callback": c
        };
        this.requestCommand(cmd);
    }
    getPopulation(q, att, crs, c) {
        var cmd = {
            'type': 'output',
            'species': q,
            'attributes': att,
            "crs": crs,
            'socket_id': this.socket_id,
            'exp_id': this.exp_id,
            "callback": c
        };
        this.requestCommand(cmd);
    }

    launch(c) {
        var myself=this;
        this.execute("launch", function (e) {
            console.log(e);
            var result = JSON.parse(e);
            if (result.exp_id) myself.exp_id = result.exp_id;
            if (result.socket_id) myself.socket_id = result.socket_id;
            if (c) c();
        });
    }
    play(c) {
        this.execute("play");
        if (c) c();
    }

    pause(c) {
        this.execute("pause");
        if (c) c();
    }

    step(c) {
        this.execute("step");
        if (c) c();
    }


    reload(c) {
        this.execute("reload");
        if (c) c();
    }

}  