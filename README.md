# gama.client
Gama Client - Repository dedicated to development of different Gama Client and the corresponding GAMA API


User guide:

To communicate with Gama through Websocket and using JS, import the dev/GAMA.js library in your html code:

```html
	<script src="./dev/GAMA.js"></script>
``` 

# Current available syntax:

## Create new gama connector:

```javascript
const experiment = new GAMA(Websocket Host Address, Absolute Model Path, Experiment Name);
```

## Connect to server:

```javascript
experiment.connect( Callback function on connected, Callback function on disconnected);
```

## Life-cycle Control:

```javascript
experiment.launch(Callback function when the command accomplish);
  
experiment.play(Callback function when the command accomplish);//play the simulation and if the end condition is not blank, it will wait for its finishing before execute the callback
  
experiment.pause(Callback function when the command accomplish);
  
experiment.step(Callback function when the command accomplish);
  
experiment.reload(Callback function when the command accomplish);
``` 

## Input:
### Set the list of input values of the experiment's parameters

```javascript
  experiment.setParameters([
  
     { "name": Parameter tilte or Variable name, "value": val, "type": "int" or "float" or "string" },
      ...
   ]);
```
    
### Set end condition (as same as until facet in batch mode)

```javascript
experiment.setEndCondition(GAML boolean expression as String);
``` 

## Output:
### Expression evaluation
The expression can be any syntax that accepted in Interactive Console, including action in model.

```javascript
experiment.evalExpr(GAML Expression as String, Callback function on message received from server);
```    

### Population serialized as geojson

```javascript
experiment.getPopulation( Species name, List of attributes, CRS code, Callback function);
```

Cause of avoiding large data transmit, when List of attributes is blank, the geojson included only the geometries data.
  
  
# Example:
An example of simple syntax found at  https://github.com/gama-platform/gama.client/blob/main/js/simple_syntax.js . It is included in syntax.html

```javascript
    var ABSOLUTE_PATH_TO_GAMA = 'C:\\git\\';
    var modelPath = ABSOLUTE_PATH_TO_GAMA + 'gama/msi.gama.models/models/Tutorials/Road Traffic/models/Model 05.gaml';
    var experimentName = 'road_traffic';
    const experiment = new GAMA("ws://localhost:6868/", modelPath, experimentName);
    experiment.logger = log;
    experiment.connect(on_connected);
    function on_connected() {
	    experiment.setParameters([
	      { "name": "Number of people agents", "value": 111, "type": "int" },
	      { "name": "Value of destruction when a people agent takes a road", "value": 0.2, "type": "float" }
	    ]);

	    experiment.setEndCondition("cycle>=15");
	    experiment.launch();
	    experiment.play();
	    experiment.evalExpr("create people number:100;", onReceiveMsg);
	    experiment.evalExpr("length(people)", onReceiveMsg);
	    experiment.evalExpr("cycle", onReceiveMsg);

	    experiment.setParameters([
	      { "name": "Number of people agents", "value": "333", "type": "int" },
	      { "name": "Value of destruction when a people agent takes a road", "value": "0.2", "type": "float" }
	    ]);
	    experiment.setEndCondition("cycle>=10000");
	    experiment.reload();
	    experiment.evalExpr("cycle", onReceiveMsg);


	    experiment.play();
	    experiment.evalExpr("length(people)", onReceiveMsg);
	    experiment.evalExpr("cycle", onReceiveMsg);
    }
```
