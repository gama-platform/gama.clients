// simple script to showcase the capabilities of the gamaClient.ts library
// to run this script: npx tsx testScript.ts
import GamaClient from "./src/gama_client.ts"
import { getLogger, configure, getConsoleSink } from "@logtape/logtape"
const logger = getLogger(["GAMA-library", "GAMA-script"])
await configure({
    sinks: { console: getConsoleSink() },
    loggers: [
        { category: "test-script", lowestLevel: "debug", sinks: ["console"] },
        { category: ["logtape", "meta"], lowestLevel: "warning", sinks: ["console"] }
    ]
})


const clientTest = new GamaClient()
const experiment = "C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml"


await clientTest.connectGama();
clientTest.onMessage((data) => console.log(data))
await clientTest.loadExperiment("zaerzaerazer", "prey_predatorest")
// await clientTest.step(15,true)
 await clientTest.stop()
 clientTest.closeConnection(() => console.log("should print something in the console"))
