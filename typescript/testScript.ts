// simple script to showcase the capabilities of the gamaClient.ts library

import GamaClient from "./src/gama_client.ts"


const clientTest = new GamaClient()
const experiment = "C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml"
await clientTest.connectGama()
clientTest.onMessage((data) => console.log(data))
await clientTest.loadExperiment(experiment, "prey_predator")
await clientTest.step(100)

console.log(status)