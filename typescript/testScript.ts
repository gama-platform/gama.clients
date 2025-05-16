// simple script to showcase the capabilities of the gamaClient.ts library

import GamaClient from "./src/gama_client.ts"

const clientTest = new GamaClient()
await clientTest.connectGama()
clientTest.onMessage((data) => console.log(data))



// await clientTest.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")


console.log("using play command now")
 clientTest.play()
 clientTest.play()

 clientTest.pause()
 clientTest.pause()

// await clientTest.validate('float energy <- rnd(max_energy) update: energy - energy_consum max: max_energy;')

 clientTest.stop()

// clientTest.disconnectGama()



