import WebSocket from 'ws';
import { GamaState, GAMA_ERROR_MESSAGES } from "./constants.ts";
import { getLogger } from '@logtape/logtape';

const logger = getLogger(["GAMA-library", "GAMA-client"])
/**
 * This class creates a websocket client for Gama Server.
 * uses port 1000 and host localhost unless specified otherwise.
 */
export default class GamaClient {

    private jsonGamaState: GamaState;                  // json object detailing the state of the gama server, including: if connected, experiment details, errors from the server, and loading status
    private port: number = 1000;                       //default port number pointing to the gama server. can be redefined when using the constructor
    private host: string = "localhost";                // default host pointing to the gama server. can be redefined when using the constructor
    private gama_socket!: WebSocket;                   //websocket of the client. needs to be initialized by using the asynchronous connectGama() to be used               

    /**
     * 
     * @param port port of gama server you want to reach
     * @param host host of the gama server you want to reach
     */
    constructor(port?: number, host?: string) {

        // Initialise class and settings before first attempt to connect to gama
        this.jsonGamaState = {
            connected: false,
            model_path: "",
            experiment_state: "NONE",
            loading: false,
            content_error: "",
            experiment_id: "",
            experiment_name: ""
        };
        this.port = port || 1000;
        this.host = host || "localhost";

    }

    //? GETTERS

    public isConnected(): boolean {
        return this.jsonGamaState.connected;
    }

    public getExperimentState(): string {
        return this.jsonGamaState.experiment_state;
    }

    public isLoading(): boolean {
        return this.jsonGamaState.loading;
    }

    public getContentError(): string {
        return this.jsonGamaState.content_error;
    }

    public getExperimentId(): string {
        return this.jsonGamaState.experiment_id;
    }
    public getModelPath(): string {
        return this.jsonGamaState.model_path;
    }

    public getExperimentName(): string {
        return this.jsonGamaState.experiment_name;
    }

    public getReadyState(): number {
        return this.gama_socket.readyState;
    }

    public getPort(): number {
        return this.port;
    }

    public getHost(): string {
        return this.host;
    }

    public getSocket(): WebSocket{
        return this.gama_socket;
    }

    //? SETTERS --------------------------------------------------------------------------------------------------------------------------------------

    private setConnected(connected: boolean) {
        this.jsonGamaState.connected = connected;
    }

    private setExperimentState(state: string) {
        this.jsonGamaState.experiment_state = state;
    }

    private setLoading(loading: boolean) {
        this.jsonGamaState.loading = loading;
    }

    private setContentError(content_error: string) {
        this.jsonGamaState.content_error = content_error;
    }

    private setExperimentId(experiment_id: string) {
        this.jsonGamaState.experiment_id = experiment_id;
    }

    private setExperimentName(experiment_name: string) {
        this.jsonGamaState.experiment_name = experiment_name;
    }

    private setModelPath(model_path: string) {
        this.jsonGamaState.model_path = model_path;
    }

    //? INTERNAL UTILITIES ---------------------------------------------------------------------------------------------------------------------------

    /**
     * internal function to avoid unecessary boilerplate code,
     * checks if gamasocket exists, and if it's ready to accept a new message
     */
    private socketCheck() {
        if (!this.gama_socket) {
            throw new Error("No socket connected to GAMA Server found");
        } else if (!this.jsonGamaState.connected) {
            throw new Error("Gama is not connected")
        }
        else if (!(this.gama_socket.readyState === WebSocket.OPEN || this.gama_socket.readyState === WebSocket.CONNECTING)) {
            throw new Error("socket not in the OPEN state")
        } else {
            logger.trace("Websocket is connected and open")
            this.setConnected(true)
        }
    }

    /**
     * internal function that contains a simple try catch and stringifies a json payload to send it to the websocket
     * @param payload json payload to be sent
     */

    private sendPayload(payload: any) {
        try {
            this.gama_socket.send(JSON.stringify(payload))
            logger.debug("sent message to websocket:{payload}", { payload })
        } catch (error) {
            throw new Error(`couldn't send the message to the websocket:${error}`);
        }
    }
    /**
     * internal function that returns the string of an experiment to run
     * it represents the last used experiment or the new one if any specified
     * @param new_exp_id id of the experiment passed by  the user in parameter. used by default, sets the current experience to itself
     * @returns the string of the Id of the last used experiment. Used if no new_exp_id is given
     */
    getId(new_exp_id?: string): string {
        if (new_exp_id) {
            this.setExperimentId(new_exp_id);
            return new_exp_id
        } else {
            if (this.jsonGamaState.experiment_id === "") throw new Error("no current experiment called");
            return this.jsonGamaState.experiment_id
        }
    }

    /**
     * async function that closes the websocket connection, and runs the callback function passed in parameter if any.
     * When called, creates a promise that either rejects after 15 seconds to avoid timeout lockdowns,
     * or resolves after the close internalListener fires. 
     * @param optional callback Function to be called after the websocket's connection is closed
     */
    public async closeConnection(callback?: () => void) {
        if (!this.gama_socket || this.gama_socket.readyState === WebSocket.CLOSED) {
            logger.warn("Websocket already closed, running the callback function")
            if (callback) callback();
            return;
        }

        if (this.gama_socket.readyState === WebSocket.OPEN || this.gama_socket.readyState === WebSocket.CONNECTING) {
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.gama_socket.removeEventListener('close', internalListener);
                    reject(new Error("Websocket timed out"))
                })

                const internalListener = () => {
                    clearTimeout(timer);
                    this.gama_socket.removeEventListener('close', internalListener);
                    resolve();
                }
                this.gama_socket.addEventListener('close', internalListener)
                this.gama_socket.close();
            })

            if (callback) callback();
        }
    }



    /**
    * Connects the websocket client with gama server and manage the messages received
    * this function is asynchronous, it needs to be called with await. This is because
    * other functions need the websocket to be created and in the state "OPEN" to start
    * sending messages, which is not done when the function has finished it's execution
    * @returns WebSocket properly initialised at the end of the asynchronous execution
    */
    async connectGama(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.gama_socket && (this.gama_socket.readyState === WebSocket.OPEN || this.gama_socket.readyState === WebSocket.CONNECTING)) {
                this.setConnected(true)
                logger.info("Already connected or connecting. Skipping. status:{status}", { status: this.gama_socket.readyState });
                return resolve(); // Prevent multiple connection attempts
            }
            try {
                this.gama_socket = new WebSocket(`ws://${this.host}:${this.port}`);
                this.gama_socket.onopen = () => {
                    this.setConnected(true)
                    logger.info("created new connection to {host}:{port}", { host: this.host, port: this.port })

                    this.gama_socket.onclose = () => {
                        this.setConnected(false)
                        this.setExperimentState("NONE")
                        logger.info("successfully closed the websocket.")

                    }
                    /**
                     * function that creates a listener that updates the simulation status contained in the jsongamastate
                     * it listens for messages of type SimulationStatus, then updates using the content of the message
                     * @param event
                     */
                    const simulationStatus = (event: WebSocket.MessageEvent) => {
                        const message = JSON.parse(event.data as string)
                        if (message.type === 'SimulationStatus') {
                            this.setExperimentState(message.content);
                            this.setExperimentId(message.exp_id)
                        }
                        logger.info("JsonGamaState:{state}", { state: this.jsonGamaState.experiment_state })
                    }
                    this.gama_socket.addEventListener('message', simulationStatus)
                    return resolve();
                }
                this.gama_socket.onerror = (error) => {
                    this.setConnected(false);
                    if (error.error.code == 'ECONNREFUSED') {
                        logger.trace(`full stack trace for Error CONNREFUSED {error}`, { error });
                        logger.error("The platform can't connect to GAMA at address {host}:{port}", { host: this.host, port: this.port });
                        reject(new Error(`Failed to connect to GAMA at ${this.host}:${this.port} with error code ECONNREFUSED`))
                    } else {
                        logger.error(`An error happened within the Gama Server WebSocket\n{error}`, { error });
                        reject(new Error(`Failed to connect to GAMA at ${this.host}:${this.port}`))
                    }
                }
            }
            catch (e) {
                const err = e as Error;
                logger.error("Synchronous error when creating the websocket:{error}", { error: err.message })
                reject(e)

            }

        })
    }
    /**
 * This function is used to watch on messages stream and look for a response to the command initiated.
 * it resolves if the message received is of the same type specified in the parameter
 * and throws an error if it's of any type specified in the GAMA_ERROR_MESSAGES specified in the constants file
 * @returns returns a promise containing the response's message's content
 */
    async success(successMessage: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const onMessage = (event: WebSocket.MessageEvent) => {
                const message = JSON.parse(event.data as string)
                const type = message.type
                if (type === successMessage) {
                    this.gama_socket.removeEventListener('message', onMessage)
                    resolve(JSON.stringify(message))
                } else if (GAMA_ERROR_MESSAGES.includes(type)){
                    this.gama_socket.removeEventListener('message', onMessage)
                    this.setContentError(message.content)
                    reject(`Couldn't execute command on the Gama Server. ${type}: ${JSON.stringify(message.content)}`)
                }
            }
            this.gama_socket.addEventListener('message', onMessage)
        })
    }


    /**
     * function used to check for a specific message on the websocket.
     * returns a resolved boolean promise once the provided message is found
     * @param messageType the basic type of the message you want to analyse
     * @param field what part of the message to analyse 
     * @param expectedValue what you expect the field value to be
     * @returns a resolved promise containing a boolean
     */

    //Voir pour retourner le message au lieu de juste retourner un booléen ? 
    async listenFor(messageType: string, field: string, expectedValue: any): Promise<boolean> {
        if (!this.gama_socket) {
            throw new Error("couldn't find an active gama socket when creating a listener:")
        }
        return new Promise((resolve) => {
            const listener = (event: WebSocket.MessageEvent) => {
                const message = JSON.parse(event.data as string)
                logger.debug("message:  {message}", { message: message })
                const type = message.type
                if (type === messageType && message[field] === expectedValue) {
                    resolve(true)
                    this.gama_socket.removeEventListener('message', listener)
                }
            }
            this.gama_socket.addEventListener('message', listener)
            logger.debug("added an event listener to the gama_socket")
        })
    }




    //? GAMA FUNCTIONS ---------------------------------------------------------------------------------------------------------------------------


    /**
     * loads and launches an experiment using the absolute path of it's model and
     * the identifier of the experiment
     * @param model_path absolute path pointing to the model cointaining the experiment
     * @param experiment id of the experiment to load
     */
    async loadExperiment(model_path: string, experiment: string): Promise<boolean> {
        this.socketCheck()
        const payload = {
            "type": "load",
            "model": model_path,
            "experiment": experiment,
        }
        this.sendPayload(payload)
        this.setModelPath(model_path);
        this.setExperimentName(experiment);
        this.setExperimentId(experiment)
        await this.success("CommandExecutedSuccessfully")
        return await this.listenFor("SimulationStatus", "content", "PAUSED")
    }


    /**
     * Starts or resumes the experiment specified.
     * @param exp_id string name of the experiment to pause or resume
     * @param sync boolean used if an end condition was specified when loading a simulation. the command will return only the SimulationEnded message if true, and both a response and a SimulationEnded message if false
     * when starting the experiment
     */
    async play(exp_id?: string, sync?: boolean) {
        this.socketCheck()
        if (this.jsonGamaState.experiment_state === "NOTREADY") {
            await this.listenFor("Simulationstatus", "content", "PAUSED")
        }
        else if (this.jsonGamaState.experiment_state === 'PAUSED') {

            const payload = {
                "type": "play",
                "exp_id": this.getId(),
                ...(sync && { "sync": sync })
            }
            this.sendPayload(payload)
            return await this.success("CommandExecutedSuccessfully")
        }
        else if (this.jsonGamaState.experiment_state === "RUNNING") {
            logger.warn("cannot unpause a running simulation")
        }
    }

    /**
     * Pauses the experiment specified.
     * @param exp_id optionnal parameter, will default to last used experiment
     */
    async pause(exp_id?: string) {
        this.socketCheck()
        const payload = {
            "type": "pause",
            "exp_id": this.getId(exp_id)
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully")
    }

    async reload(exp_id?: string, parameters?: string, until?: string) {
        this.socketCheck()
        if (this.jsonGamaState.experiment_state === "NOTREADY") {
            await this.listenFor("Simulationstatus", "content", "PAUSED")
        }
        const payload = {
            "type": "reload",
            "exp_id": this.getId(exp_id),
            ...(parameters && { "parameters": parameters }),
            ...(until && { "until": until })
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully")
    }





    /**
     * Sends a message to gama to order it to process a specified number of steps.
     * Can only be used after the simulation has already been loaded
     * @param exp_id the name of the experiment you want to step to. if not used, then the last used experiment Id will be used
     * @param nb_step the number of steps you want to simulate. if none is specified, it will default to one step
     */
    async step(nb_step?: number, sync?: boolean, exp_id?: string) {
        this.socketCheck()
        if (this.jsonGamaState.experiment_state === "NOTREADY") {
            logger.warn("The experiment is not yet ready:{state}", { state: this.jsonGamaState.experiment_state })
            await this.listenFor("Simulationstatus", "content", "PAUSED")
        }
        const exp_id_payload = exp_id ? exp_id : this.jsonGamaState.experiment_id
        if (exp_id_payload === "") throw new Error("no experience_id specified, and no experiment in the jsongamastate")

        const payload = {
            "type": "step",
            "exp_id": exp_id_payload,
            ...(nb_step && { "nb_step": nb_step }),
            "sync": true
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully")
    }


    /** 
     * ! does NOT work at the moment, must also check if the type of the experiment is compatible (memorize)
     * This command is used to rollback a specific amount of steps.
     * Can only be used if the experiment is of type "memorize"
     * @param exp_id  the name of the experiment you want to step to. if not used, then the last used experiment Id will be used
     * @param nb_step  the number of steps you want to simulate. if none is specified, it will default to one step
     */

    private async stepback(nb_step?: number, exp_id?: string) {
        this.socketCheck()
        const payload = {
            "type": "stepBack",
            "exp_id": this.getId(exp_id),
            ...(nb_step && { "nb_step": nb_step }),
            "sync": true
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully")
    }


    /**
     * stops the specified experiment or the current experiment if not specified
     * @param exp_id optionnal parameter, leave empty to use the last used exp_id
     */
    async stop(exp_id?: string) {
        this.socketCheck()
        if (this.jsonGamaState.experiment_state !== "NONE") {
            try {
                const payload = {
                    "type": "stop",
                    "exp_id": this.getId(exp_id)
                }
                this.gama_socket.send(JSON.stringify(payload))
                return await this.success("CommandExecutedSuccessfully")
            } catch (error) {
                throw new Error(`couldn't stop the experiment:${error}`);
            }
        } else {
            logger.warn(`couldn't stop the experiment, no experiment running`)
            return new Promise((resolve) => {
                resolve("couldn't stop experiment")
            })
        }

    }


    /**
     * used to specify a fonction to be called on any message received by the websocket from the gama server
     * you can only have one onMessage per client.
     * @param callback the function you want to call upon receiving data through the javascript client
     */
    onMessage(callback: (data: any) => void): void {
        //the condition is written in reverse to avoid uncessary condition nesting
        if (!this.gama_socket) {
            throw new Error('WebSocket is not initialized');
        }

        this.gama_socket.on('message', (data) => {
            try {
                const parsed = JSON.parse(data.toString());
                callback(parsed);
            } catch (err) {
                logger.warn('Received non-JSON message:{data}', { data: data });
                callback(data);
            }
        });
    }



    /**
     * kills the gama server.
     * used to exit the gama server, closes the websocket connection and closes the gama instance 
     */
    async killGamaServer() {
        this.socketCheck()
        const payload = { "type": "exit" }
        this.sendPayload(payload)
        //killing the gama server does not return any message

    }

    /**
     * used to run execute an action defined in an agent in an experiment.
     * @param action gaml code to be run from an agent
     * @param args arguments of the action
     * @param agent what agent this code applies to
     * @param escaped optional parameter, if true will escape the action and args before sending them to gama
     * @param exp_id optionnal parameter to specify the experiment. if none is given it will instead default to the last used experiment
     * @returns a stringified response containing the result of the execution of the command
     */
    async ask(action: string, args: string, agent: string, escaped?: boolean, exp_id?: string): Promise<string> {
        this.socketCheck()
        var payload = {
            "type": "ask",
            "exp_id": this.getId(exp_id),
            "action": action,
            "args": args,
            "agent": agent,
            ...(escaped && { "escaped": escaped })
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully");



    }
    /**
     * Compiles the code given in parameter and returns a message if any errors are detected.
     * @param expr gaml expression to test
     * @param syntax optionnal boolean, if true will only check the syntax. false will check for both syntactical and semantic errors
     * @param escaped optionnal boolean, dictates if the expression is escaped or not
     * @returns stringified json containing errors in the code if any
     */
    async validate(expr: string, syntax?: boolean, escaped?: boolean): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "validate",
            "expr": expr,
            ...(syntax && { "syntax": syntax }),
            ...(escaped && { "escaped": escaped })
        }
        this.sendPayload(payload)
        return await this.success("")


    }
    /**
     * This command is used to ask the server more information on a given model. When received, 
     * the server will compile the model and return the different components found, depending on the option picked by the client.
     * @param model_path path to the model to evaluate
     * @param experimentsNames optional boolean that returns the name of all the experiments of the model
     * @param speciesNames optional boolean that returns all of the species' names
     * @param speciesVariables optional boolean that returns all variables of the species
     * @param speciesActions optional boolean that returns all actions in the species
     */
    async describe(model_path: string, experimentsNames?: boolean, speciesNames?: boolean, speciesVariables?: boolean, speciesActions?: boolean): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "describe",
            "model": model_path,
            ...(experimentsNames && { "experiments": experimentsNames }),
            ...(speciesNames && { "speciesNames": speciesNames }),
            ...(speciesActions && { "speciesActions": speciesActions }),
            ...(speciesVariables && { "speciesVariables": speciesVariables })
        }
        this.sendPayload(payload)
        return await this.success("CommandExecutedSuccessfully")
    }
}










