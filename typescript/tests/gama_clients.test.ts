import GamaClient from "../src/gama_client";



describe('GamaClient', () => {
    it("should create an instance with default values", () => {
        const client = new GamaClient();
        expect(client.port).toBe(1000)
        expect(client.host).toBe("localhost")
        expect(client.listMessages).toEqual([]);
        expect(client.jsonGamaState.connected).toBe(false);
    });
})


describe('GamaClient',() =>{
    it("should not pause while using play", async () =>{
        const client = new GamaClient();
        client.connectGama()
        await client.loadExperiment("C:/Users/guill/Documents/gama/gama.library/models/Tutorials/Predator Prey/models/Model 13.gaml", "prey_predator")
        client.play()
        client.play()
        expect(client.jsonGamaState).toBe("RUNNING")
    });
})