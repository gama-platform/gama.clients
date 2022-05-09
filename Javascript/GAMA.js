class GAMA {
    ABSOLUTE_PATH_TO_GAMA = "";
    modelPath = 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
    experimentName = 'road_traffic';
    species1Name = 'people';
    attribute1Name = 'objective';
    species2Name = 'building';
    attribute2Name = 'type';
    launchSocket;
    constructor(address,md, exp) {
        this.modelPath = md;
        this.experimentName = exp;
        launchSocket= new WebSocket(address);

    }
    // Getter
    get area() {
        return this.calcArea();
    }
    // Method
    calcArea() {
        return this.modelPath + " " + this.experimentName;
    }
}

const square = new GAMA("model", "exp_name");

console.log(square.area); // 100