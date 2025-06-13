import GamaClient from "../src/gama_client";
let client!: GamaClient;

beforeEach(async () => {
    client = new GamaClient()
    await client.connectGama()
})

afterEach(async () => {
    if (client.jsonGamaState.experiment_state !== "NONE") {
        client.stop()
        if (client.gama_socket?.readyState === WebSocket.OPEN) {
            await new Promise<void>((resolve) => {
                client.gama_socket!.onclose = () => resolve();
                client.gama_socket!.close();
            });
        }
    }
});


describe('GamaClient', () => {
    it("should create an instance with default values", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        expect(client.port).toBe(1000)
        expect(client.host).toBe("localhost")
        expect(client.listMessages).toEqual([]);
        expect(client.jsonGamaState.connected).toBe(false);
    });
})


describe('GamaClient', () => {
    it("should not pause while using play", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        await client.play()
        expect(client.jsonGamaState.experiment_state).toContain("RUNNING")
        await client.play()
        expect(client.jsonGamaState.experiment_state).toContain("RUNNING")

    });
})

describe('GamaClient', () => {
    it("should not break while using two consecutive pauses", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        client.pause()
        client.pause()
        expect(client.jsonGamaState.experiment_state).toContain("PAUSED")
    })
})

describe('GamaClient', () => {
    it("should stop the current experiment", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        await client.play()
        await client.pause()
        await client.stop()
        expect(client.jsonGamaState.experiment_state).toContain("NONE")
    })
})

describe('GamaClient', () => {
    it("should update the current experiment", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        expect(client.jsonGamaState.experiment_id).toBe('0')
        await client.stop()
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Modeling/Model Coupling/Co-AntPreyPredator/Ants Adapter.gaml", "Experiment Base")
        expect(client.jsonGamaState.experiment_name).toBe("Experiment Base")
    }, 10000)
})


describe('GamaClient', () => {
    it("should not unpause while using pause", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        await client.pause()
        await client.pause()
        expect(client.jsonGamaState.experiment_state).toContain('PAUSED')

    }, 10000);

})

describe('GamaClient', () => {
    it("should correctly send steps", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        const status = await client.step()
        expect(status).toContain("CommandExecutedSuccessfully")

    })
})


describe('GamaClient', () => {
    it("should correctly use steps above 15", async () => {
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        const status = await client.step(16)
        expect(status).toContain("CommandExecutedSuccessfully")
    })
})


// previous experiment should be stored correctly (runnin 2 simulation,after running the first one should be it, then running the second should correctly change it)