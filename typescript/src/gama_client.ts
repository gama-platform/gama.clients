import type { GamaState, GamaMessage, GamaParameter, ExperimentState } from "./constants.ts";
import { GAMA_ERROR_MESSAGES, MessageTypes, WS_READY_STATE } from "./constants.ts";
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

    public getExperimentState(): ExperimentState {
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
        if (!this.gama_socket) return WS_READY_STATE.CLOSED;
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

    private setExperimentState(state: ExperimentState) {
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
        else if (!(this.getReadyState() === WS_READY_STATE.OPEN || this.getReadyState() === WS_READY_STATE.CONNECTING)) {
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

    private sendPayload(payload: Record<string, unknown>) {
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
            if (this.getExperimentId() === "") throw new Error("no current experiment to be called");
            return this.getExperimentId()
        }
    }

    /**
     * async function that closes the websocket connection, and runs the callback function passed in parameter if any.
     * When called, creates a promise that either rejects after 15 seconds to avoid timeout lockdowns,
     * or resolves after the close internalListener fires. 
     * @param optional callback Function to be called after the websocket's connection is closed
     */
    public async closeConnection(callback?: () => void) {
        if (!this.gama_socket || this.getReadyState() === WS_READY_STATE.CLOSED) {
            logger.warn("Websocket already closed, running the callback function")
            if (callback) callback();
            return;
        }

        if (this.getReadyState() === WS_READY_STATE.OPEN || this.getReadyState() === WS_READY_STATE.CONNECTING) {
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.gama_socket.removeEventListener('close', internalListener);
                    reject(new Error("Websocket timed out"))
                }, 15000)

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
        // Use native WebSocket in browsers, fall back to 'ws' package in Node.js
        const WS: typeof WebSocket = typeof globalThis.WebSocket !== 'undefined'
            ? globalThis.WebSocket
            : (await import('ws')).default as unknown as typeof WebSocket;

        return new Promise((resolve, reject) => {
            if (this.gama_socket && (this.getReadyState() === 1 /* OPEN */ || this.getReadyState() === 0 /* CONNECTING */)) {
                this.setConnected(true)
                logger.info("Already connected or connecting. Skipping. status:{status}", { status: this.getReadyState() });
                return resolve(); // Prevent multiple connection attempts
            }
            try {
                this.gama_socket = new WS(`ws://${this.host}:${this.port}`);
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
                    const simulationStatus = (event: MessageEvent) => {
                        let message: GamaMessage;
                        try {
                            message = JSON.parse(event.data as string);
                        } catch {
                            logger.warn("Received non-JSON message, skipping simulationStatus update");
                            return;
                        }
                        if (message.type === 'SimulationStatus') {
                            if (message.content) {
                                this.setExperimentState(message.content as ExperimentState);
                            }
                            if (message.exp_id) {
                                this.setExperimentId(message.exp_id);
                            }
                        }
                        logger.info("JsonGamaState:{state}", { state: this.getExperimentName() })
                    }
                    this.gama_socket.addEventListener('message', simulationStatus)
                    return resolve();
                }
                this.gama_socket.onerror = (error) => {
                    this.setConnected(false);
                    // error.error.code is Node.js-specific (ws library); not available in browsers
                    const nodeCode = (error as unknown as { error?: { code?: string } }).error?.code;
                    if (nodeCode === 'ECONNREFUSED') {
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
    async success(successMessage: string, timeoutMs: number = 30000): Promise<string> {
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timer);
                this.gama_socket.removeEventListener('message', onMessage);
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out waiting for '${successMessage}' from GAMA server`));
            }, timeoutMs);

            const onMessage = (event: MessageEvent) => {
                let message: GamaMessage;
                try {
                    message = JSON.parse(event.data as string);
                } catch {
                    return; // ignore non-JSON frames
                }
                const type = message.type;
                if (type === successMessage) {
                    cleanup();
                    resolve(message as unknown as string);
                } else if ((GAMA_ERROR_MESSAGES as string[]).includes(type)) {
                    cleanup();
                    this.setContentError(message.content ?? '');
                    reject(new Error(`Couldn't execute command on the Gama Server. ${type}: ${JSON.stringify(message.content)}`));
                }
            };
            this.gama_socket.addEventListener('message', onMessage);
        });
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
    async listenFor(messageType: string, field: string, expectedValue: unknown): Promise<boolean> {
        if (!this.gama_socket) {
            throw new Error("couldn't find an active gama socket when creating a listener:")
        }

        return new Promise((resolve, reject) => {
            const listener = (event: MessageEvent) => {
                let message: GamaMessage;
                try {
                    message = JSON.parse(event.data as string);
                } catch {
                    return; // ignore non-JSON frames
                }
                logger.debug("message:  {message}", { message: message })
                const type = message.type;
                if (type === messageType && message[field] === expectedValue) {
                    clearTimeout(timer);
                    this.gama_socket.removeEventListener('message', listener);
                    resolve(true);
                }
            }

            const timer = setTimeout(() => {
                this.gama_socket.removeEventListener('message', listener);
                reject(new Error("Websocket timed out"))
            }, 15000)

            this.gama_socket.addEventListener('message', listener)
            logger.debug("added an event listener to the gama_socket")
        })
    }


    async readyCheck(): Promise<boolean> {
        if (this.getExperimentState() === "PAUSED" || this.getExperimentState() === "RUNNING") {
            return true;
        }
        try {
            return await this.listenFor("SimulationStatus", "content", "PAUSED");
        } catch {
            // Experiment may not enter PAUSED state (e.g. batch experiments) — that's acceptable
            logger.warn("readyCheck timed out waiting for PAUSED state; experiment may not support it");
            return false;
        }
    }


    //? GAMA FUNCTIONS ---------------------------------------------------------------------------------------------------------------------------


    /**
     * Loads and launches an experiment. Resolves when the server answers with a SimulationStatus of type "PAUSED".
     * @param model_path Absolute path to the model file on the server
     * @param experiment Name of the experiment to run
     * @param console True to redirect the simulation's console output
     * @param status True to redirect the simulation's status changes
     * @param dialog True to redirect the simulation's dialogs
     * @param runtime True to redirect the simulation's runtime errors
     * @param parameters List of initial parameter values, each as `{type, value, name}`
     * @param until A GAML expression representing an ending condition
     */
    async loadExperiment(
        model_path: string,
        experiment: string,
        console?: boolean,
        status?: boolean,
        dialog?: boolean,
        runtime?: boolean,
        parameters?: GamaParameter[],
        until?: string
    ): Promise<void> {
        this.socketCheck()
        const payload: Record<string, unknown> = {
            "type": "load",
            "model": model_path,
            "experiment": experiment,
        }
        if (console !== undefined) payload["console"] = console;
        if (status !== undefined) payload["status"] = status;
        if (dialog !== undefined) payload["dialog"] = dialog;
        if (runtime !== undefined) payload["runtime"] = runtime;
        if (parameters && parameters.length > 0) payload["parameters"] = parameters;
        if (until && until !== '') payload["until"] = until;

        this.sendPayload(payload)
        this.setModelPath(model_path);
        this.setExperimentName(experiment);
        // Extract the server-assigned experiment ID from the load response
        const loadResponse = await this.success(MessageTypes.CommandExecutedSuccessfully);
        const responseMsg = loadResponse as unknown as GamaMessage;
        this.setExperimentId(
            (responseMsg.content && typeof responseMsg.content === 'string')
                ? responseMsg.content
                : experiment
        );
        await this.readyCheck()
    }


    /**
     * Starts or resumes the experiment specified.
     * @param exp_id string name of the experiment to pause or resume
     * @param sync boolean used if an end condition was specified when loading a simulation. the command will return only the SimulationEnded message if true, and both a response and a SimulationEnded message if false
     * when starting the experiment
     */
    async play(exp_id?: string, sync?: boolean) {
        this.socketCheck()
        if (this.getExperimentState() === "NOTREADY") {
            logger.warn("Simulation not ready yet, waiting for PAUSED simulationstatus")
            await this.listenFor("SimulationStatus", "content", "PAUSED")
        }
        else if (this.getExperimentState() === 'PAUSED') {

            const payload = {
                "type": "play",
                "exp_id": this.getId(exp_id),
                ...(sync && { "sync": sync })
            }
            this.sendPayload(payload)
            return await this.success(MessageTypes.CommandExecutedSuccessfully)
        }
        else if (this.getExperimentState() === "RUNNING") {
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
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }

    async reload(exp_id?: string, parameters?: GamaParameter[], until?: string) {
        this.socketCheck()
        if (this.getExperimentState() === "NOTREADY") {
            await this.listenFor("SimulationStatus", "content", "PAUSED")
        }
        const payload: Record<string, unknown> = {
            "type": "reload",
            "exp_id": this.getId(exp_id),
        }
        if (parameters && parameters.length > 0) payload["parameters"] = parameters;
        if (until && until !== '') payload["until"] = until;

        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }





    /**
     * Sends a message to gama to order it to process a specified number of steps.
     * Can only be used after the simulation has already been loaded.
     * @param nb_step Number of steps to execute. Defaults to 1 (only sent to server when > 1).
     * @param sync If true gama-server waits for steps to finish before sending a success message. Defaults to false.
     * @param exp_id Experiment id. Defaults to last used experiment.
     */
    async step(nb_step: number = 1, sync: boolean = false, exp_id?: string) {
        this.socketCheck()
        if (this.getExperimentState() === "NOTREADY") {
            logger.warn("The experiment is not yet ready:{state}", { state: this.getExperimentState() })
            await this.listenFor("SimulationStatus", "content", "PAUSED")
        }
        const exp_id_payload = exp_id ? exp_id : this.getExperimentId();
        if (exp_id_payload === "") throw new Error("no experience_id specified, and no experiment in the jsongamastate")

        const payload: Record<string, unknown> = {
            "type": "step",
            "exp_id": exp_id_payload,
            "sync": sync,
        }
        if (nb_step > 1) payload["nb_step"] = nb_step;

        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }


    /** 
     * ! you must be sure that the type of the experiment is compatible (record) before using this
     * This command is used to rollback a specific amount of steps.
     * Can only be used if the experiment is of type "record"
     * @param exp_id  the name of the experiment you want to step to. if not used, then the last used experiment Id will be used
     * @param nb_step  the number of steps you want to simulate. if none is specified, it will default to one step
     */

    async stepback(nb_step: number = 1, sync?: boolean, exp_id?: string) {
        this.socketCheck()
        const payload: Record<string, unknown> = {
            "type": "stepBack",
            "exp_id": this.getId(exp_id),
        }
        if (sync !== undefined) payload["sync"] = sync;
        if (nb_step > 1) payload["nb_step"] = nb_step;

        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }


    /**
     * stops the specified experiment or the current experiment if not specified
     * @param exp_id optionnal parameter, leave empty to use the last used exp_id
     */
    async stop(exp_id?: string) {
        this.socketCheck()
        if (this.getExperimentState() !== "NONE") {
            try {
                const payload = {
                    "type": "stop",
                    "exp_id": this.getId(exp_id)
                }
                this.sendPayload(payload)
                return await this.success(MessageTypes.CommandExecutedSuccessfully)
            } catch (error) {
                throw new Error(`couldn't stop the experiment:${error}`);
            }
        } else {
            logger.warn(`couldn't stop the experiment, no experiment running`)
        }

    }


    /**
     * used to specify a fonction to be called on any message received by the websocket from the gama server
     * you can only have one onMessage per client.
     * @param callback the function you want to call upon receiving data through the javascript client
     */
    onMessage(callback: (data: GamaMessage) => void): void {
        //the condition is written in reverse to avoid uncessary condition nesting
        if (!this.gama_socket) {
            throw new Error('WebSocket is not initialized');
        }

        this.gama_socket.addEventListener('message', (event: MessageEvent) => {
            try {
                const parsed = JSON.parse(event.data as string);
                callback(parsed);
            } catch (err) {
                logger.warn('Received non-JSON message:{data}', { data: event.data });
            }
        });
    }



    /**
     * Kills the gama server. Closes the websocket connection and shuts down the gama instance.
     * No response is sent back by the server.
     */
    async exit() {
        this.socketCheck()
        const payload = { "type": "exit" }
        this.sendPayload(payload)
    }

    /**
     * Evaluates a GAML expression inside the running experiment.
     * @param expr The GAML expression to evaluate
     * @param exp_id Optional experiment id, defaults to last used experiment
     * @returns The result of the evaluation
     */
    async expression(expr: string, exp_id?: string): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "expression",
            "exp_id": this.getId(exp_id),
            "expr": expr
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }

    /**
     * Downloads a file from the gama-server file system.
     * @param file_path Path of the file to download on the server's file system
     * @returns The file content as a string
     */
    async download(file_path: string): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "download",
            "file": file_path
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }

    /**
     * Uploads a file to the gama-server file system.
     * @param file_path Destination path on the server's file system
     * @param content The content of the file to upload
     */
    async upload(file_path: string, content: string): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "upload",
            "file": file_path,
            "content": content
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
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
    async ask(action: string, args: string, agent: string, escaped: boolean = false, exp_id?: string): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "ask",
            "exp_id": this.getId(exp_id),
            "action": action,
            "args": args,
            "agent": agent,
            "escaped": escaped
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully);



    }
    /**
     * Compiles the code given in parameter and returns a message if any errors are detected.
     * @param expr gaml expression to test
     * @param syntax optionnal boolean, if true will only check the syntax. false will check for both syntactical and semantic errors
     * @param escaped optionnal boolean, dictates if the expression is escaped or not
     * @returns stringified json containing errors in the code if any
     */
    async validate(expr: string, syntax: boolean = false, escaped: boolean = false): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "validate",
            "expr": expr,
            "syntax": syntax,
            "escaped": escaped
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
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
    async describe(
        model_path: string,
        experimentsNames: boolean = true,
        speciesNames: boolean = true,
        speciesVariables: boolean = true,
        speciesActions: boolean = true
    ): Promise<string> {
        this.socketCheck()
        const payload = {
            "type": "describe",
            "model": model_path,
            "experiments": experimentsNames,
            "speciesNames": speciesNames,
            "speciesVariables": speciesVariables,
            "speciesActions": speciesActions
        }
        this.sendPayload(payload)
        return await this.success(MessageTypes.CommandExecutedSuccessfully)
    }
}










