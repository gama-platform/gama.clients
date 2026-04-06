"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// simple script to showcase the capabilities of the gamaClient.ts library
var gama_client_ts_1 = require("./src/gama_client.ts");
var clientTest = new gama_client_ts_1.default();
var experiment = "C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml";
await clientTest.connectGama();
clientTest.onMessage(function (data) { return console.log(data); });
clientTest.describe("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", true, true, true, true);
// await clientTest.loadExperiment(experiment, "prey_predator")
// await clientTest.step(100)
