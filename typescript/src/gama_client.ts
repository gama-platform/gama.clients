import type { GamaState, GamaMessage, GamaParameter, ExperimentState } from "./constants.ts";
import { CLIENT_COMMAND_ID, CommandTypes, DEFAULT_HOST, DEFAULT_PORT, MessageTypes, TIMEOUTS, WS_READY_STATE } from "./constants.ts";
import {
    answersCommand, buildPayload, errorContentToString, isAgentReference,
    isErrorMessage, normaliseAskArgs, parseMessage,
} from "./messages.ts";
import { awaitMessage, isUsable, openSocket, waitForClose } from "./socket.ts";
import { getLogger } from '@logtape/logtape';

const logger = getLogger(["GAMA-library", "GAMA-client"])
/**
 * This class creates a websocket client for Gama Server.
 * uses port 1000 and host localhost unless specified otherwise.
 */
export default class GamaClient {

    private jsonGamaState: GamaState;                  // json object detailing the state of the gama server, including: if connected, experiment details, errors from the server, and loading status
    private port: number;                              // port of the gama server, see DEFAULT_PORT
    private host: string;                              // host of the gama server, see DEFAULT_HOST
    private gama_socket!: WebSocket;                   //websocket of the client. needs to be initialized by using the asynchronous connectGama() to be used               
    private nextCommandId: number = 0;                 // counter behind the id tagged onto every outgoing command, used to match answers back
    private pauseRequested: boolean = false;           // true while a pause/stop asked by this client is in flight, to tell it apart from a pause caused by a runtime error
    private interrupted: boolean = false;              // set when the experiment left RUNNING without this client asking for it

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
        this.port = port || DEFAULT_PORT;
        this.host = host || DEFAULT_HOST;

    }

    //? GETTERS

    public isConnected(): boolean {
        return this.jsonGamaState.connected;
    }

    public getExperimentState(): ExperimentState {
        return this.jsonGamaState.experiment_state;
    }

    /**
     * @deprecated Always returns false: nothing ever sets `loading`, and it has never been
     * maintained. Kept only so the public surface does not change; slated for removal in
     * the next major.
     */
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

    /**
     * Whether the experiment left the RUNNING state without this client asking for it,
     * which is what happens when a runtime error interrupts the simulation.
     *
     * gama-server reports such an interruption as an ordinary switch to "PAUSED" and, on
     * the versions tested, sends no error message even with `runtime: true`, so a paused
     * experiment and a crashed one look identical on the wire. This flag tells them apart
     * by remembering whether the pause was asked for. It is cleared by `loadExperiment`
     * and by `stop`. See issue #30.
     * @returns true if the experiment stopped running on its own
     */
    public wasInterrupted(): boolean {
        return this.interrupted;
    }

    //? SETTERS --------------------------------------------------------------------------------------------------------------------------------------

    private setConnected(connected: boolean) {
        this.jsonGamaState.connected = connected;
    }

    private setExperimentState(state: ExperimentState) {
        this.jsonGamaState.experiment_state = state;
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
        else if (!isUsable(this.getReadyState())) {
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

    private sendPayload(payload: Record<string, unknown>): string {
        const commandId = `ts-client-${++this.nextCommandId}`;
        const tagged = { ...payload, [CLIENT_COMMAND_ID]: commandId };
        try {
            this.gama_socket.send(JSON.stringify(tagged))
            logger.debug("sent message to websocket:{payload}", { payload: tagged })
        } catch (error) {
            throw new Error(`couldn't send the message to the websocket:${error}`);
        }
        return commandId;
    }

    /**
     * internal function pairing a command with the wait for *its own* answer.
     * @param payload the command to send
     * @param successMessage the message type that means the command succeeded
     * @param timeoutMs how long to wait before giving up
     * @returns the answer sent by gama-server
     */
    private async sendCommand(
        payload: Record<string, unknown>,
        successMessage: string = MessageTypes.CommandExecutedSuccessfully,
        timeoutMs?: number
    ): Promise<GamaMessage> {
        const commandId = this.sendPayload(payload);
        return await this.success(successMessage, timeoutMs, commandId);
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

        if (isUsable(this.getReadyState())) {
            await waitForClose(this.gama_socket, TIMEOUTS.close);
            if (callback) callback();
        }
    }



    /**
     * Releases the experiment and the connection without awaiting anything, for contexts
     * that cannot wait for a promise.
     *
     * `beforeunload` is the motivating case: browsers do not keep the page alive for async
     * handlers, so `await stop()` followed by `await closeConnection()` is cut short and the
     * page reloads while the previous session is still shutting down (issue #24). Both
     * frames here are handed to the socket synchronously, which is what the browser is
     * willing to flush before navigating.
     *
     * Prefer `stop()` + `closeConnection()` anywhere you can actually await them: this
     * returns without any confirmation from the server.
     */
    public disposeSync(): void {
        if (!this.gama_socket) return;
        const open = this.getReadyState() === WS_READY_STATE.OPEN;
        if (open && this.getExperimentId() !== "" && this.getExperimentState() !== "NONE") {
            try {
                this.sendPayload({ "type": CommandTypes.Stop, "exp_id": this.getExperimentId() });
            } catch (error) {
                logger.warn("disposeSync couldn't send the stop command:{error}", { error });
            }
        }
        this.setConnected(false);
        this.setExperimentState("NONE");
        this.setExperimentId("");
        try {
            this.gama_socket.close();
        } catch (error) {
            logger.warn("disposeSync couldn't close the socket:{error}", { error });
        }
    }

    /**
     * Keeps the tracked state in step with what the server reports.
     *
     * Runs on every frame, independently of whichever command may be awaiting an answer.
     * @param event the frame received
     */
    private handleStatusMessage(event: MessageEvent): void {
        const message = parseMessage(event.data);
        if (message === undefined) {
            logger.warn("Received non-JSON message, skipping simulationStatus update");
            return;
        }
        if (isErrorMessage(message.type)) {
            // Keep the last error visible even when nobody was awaiting a command.
            this.setContentError(errorContentToString(message.content));
        }
        if (message.type !== MessageTypes.SimulationStatus) return;

        // gama-server broadcasts status changes to *every* open connection, not only the
        // one owning the experiment, and the exp_id they carry is a per-socket index
        // rather than the id `load` returned. Adopting them blindly makes a freshly
        // opened client believe it owns an experiment that belongs to another session —
        // the browser-reload race of issue #24. So they are only tracked once this client
        // has loaded something itself, and the experiment id is never taken from them.
        if (this.getExperimentId() === "") {
            logger.debug("ignoring a SimulationStatus received before this client loaded an experiment")
            return;
        }
        if (!message.content) return;

        const previous = this.getExperimentState();
        const next = message.content as ExperimentState;
        // A run that leaves RUNNING on its own was interrupted by the simulation itself
        // (a runtime error, typically), as opposed to one this client paused or stopped.
        // See issue #30.
        if (previous === "RUNNING" && next === "PAUSED" && !this.pauseRequested) {
            logger.warn("the experiment left RUNNING without the client asking for it")
            this.interrupted = true;
        }
        this.setExperimentState(next);
        logger.info("JsonGamaState:{state}", { state: this.getExperimentName() })
    }

    /**
    * Connects the websocket client with gama server and manage the messages received
    * this function is asynchronous, it needs to be called with await. This is because
    * other functions need the websocket to be created and in the state "OPEN" to start
    * sending messages, which is not done when the function has finished it's execution
    * @returns WebSocket properly initialised at the end of the asynchronous execution
    */
    async connectGama(): Promise<void> {
        if (this.gama_socket && isUsable(this.getReadyState())) {
            this.setConnected(true)
            logger.info("Already connected or connecting. Skipping. status:{status}", { status: this.getReadyState() });
            return; // Prevent multiple connection attempts
        }

        try {
            this.gama_socket = await this.createSocket(`ws://${this.host}:${this.port}`);
        } catch (e) {
            const err = e as Error;
            logger.error("Synchronous error when creating the websocket:{error}", { error: err.message })
            throw e;
        }

        return new Promise((resolve, reject) => {
            this.gama_socket.onopen = () => {
                this.setConnected(true)
                logger.info("created new connection to {host}:{port}", { host: this.host, port: this.port })

                this.gama_socket.onclose = () => {
                    this.setConnected(false)
                    this.setExperimentState("NONE")
                    logger.info("successfully closed the websocket.")
                }
                this.gama_socket.addEventListener('message', (event: MessageEvent) => this.handleStatusMessage(event))

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
        })
    }

    /**
     * Creates the underlying websocket. Overridable so a test can drive the client
     * without a server; not part of the supported API.
     * @param url the address to connect to
     * @returns the socket, not yet open
     */
    protected async createSocket(url: string): Promise<WebSocket> {
        return await openSocket(url);
    }

    /**
 * This function is used to watch on messages stream and look for a response to the command initiated.
 * it resolves if the message received is of the same type specified in the parameter
 * and throws an error if it's of any type specified in the GAMA_ERROR_MESSAGES specified in the constants file
 * @returns returns a promise containing the response's message's content
 */
    async success(successMessage: string, timeoutMs: number = TIMEOUTS.answer, commandId?: string): Promise<GamaMessage> {
        return awaitMessage<GamaMessage>(
            this.gama_socket,
            (event) => {
                const message = parseMessage(event.data);
                if (message === undefined) return undefined;          // not JSON, ignore
                if (!answersCommand(message, commandId)) {
                    logger.debug("ignoring an answer meant for another command")
                    return undefined;
                }
                if (message.type === successMessage) return { done: true, value: message };
                if (isErrorMessage(message.type)) {
                    this.setContentError(errorContentToString(message.content));
                    return {
                        done: false,
                        error: new Error(`Couldn't execute command on the Gama Server. ${message.type}: ${JSON.stringify(message.content)}`),
                    };
                }
                return undefined;                                      // somebody else's frame
            },
            timeoutMs,
            () => new Error(`Timed out waiting for '${successMessage}' from GAMA server`),
        );
    }

    /**
     * function used to check for a specific message on the websocket.
     * returns a resolved boolean promise once the provided message is found
     * @param messageType the basic type of the message you want to analyse
     * @param field what part of the message to analyse 
     * @param expectedValue what you expect the field value to be
     * @returns a resolved promise containing a boolean
     */

    async listenFor(messageType: string, field: string, expectedValue: unknown): Promise<boolean> {
        if (!this.gama_socket) {
            throw new Error("couldn't find an active gama socket when creating a listener:")
        }
        return awaitMessage<boolean>(
            this.gama_socket,
            (event) => {
                const message = parseMessage(event.data);
                if (message === undefined) return undefined;
                logger.debug("message:  {message}", { message })
                if (message.type === messageType && message[field] === expectedValue) {
                    return { done: true, value: true };
                }
                return undefined;
            },
            TIMEOUTS.listen,
            () => new Error("Websocket timed out"),
        );
    }


    /**
     * Blocks while the experiment is still initialising, so a command is not sent before
     * it can be served. No-op once the experiment is ready.
     */
    private async awaitPausedIfNotReady(): Promise<void> {
        if (this.getExperimentState() !== "NOTREADY") return;
        logger.warn("The experiment is not yet ready:{state}", { state: this.getExperimentState() })
        await this.listenFor(MessageTypes.SimulationStatus, "content", "PAUSED");
    }

    async readyCheck(): Promise<boolean> {
        if (this.getExperimentState() === "PAUSED" || this.getExperimentState() === "RUNNING") {
            return true;
        }
        try {
            return await this.listenFor(MessageTypes.SimulationStatus, "content", "PAUSED");
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
        const payload = buildPayload({
            "type": CommandTypes.Load,
            "model": model_path,
            "experiment": experiment,
        }, {
            console, status, dialog, runtime,
            parameters: parameters && parameters.length > 0 ? parameters : undefined,
            until: until ? until : undefined,
        });

        const commandId = this.sendPayload(payload);
        this.setModelPath(model_path);
        this.setExperimentName(experiment);
        // Extract the server-assigned experiment ID from the load response
        const loadResponse = await this.success(MessageTypes.CommandExecutedSuccessfully, undefined, commandId);
        this.setExperimentId(
            (loadResponse.content && typeof loadResponse.content === 'string')
                ? loadResponse.content
                : experiment
        );
        this.interrupted = false;
        this.pauseRequested = false;
        await this.readyCheck()
    }


    /**
     * Starts or resumes the experiment specified.
     * @param exp_id string name of the experiment to pause or resume
     * @param sync boolean used if an end condition was specified when loading a simulation. the command will return only the SimulationEnded message if true, and both a response and a SimulationEnded message if false
     * when starting the experiment
     */
    async play(exp_id?: string, sync?: boolean): Promise<GamaMessage | undefined> {
        this.socketCheck()
        if (this.getExperimentState() === "NOTREADY") {
            logger.warn("Simulation not ready yet, waiting for PAUSED simulationstatus")
            await this.awaitPausedIfNotReady()
        }
        else if (this.getExperimentState() === 'PAUSED') {

            const payload = buildPayload({
                "type": CommandTypes.Play,
                "exp_id": this.getId(exp_id),
            }, { sync: sync ? sync : undefined });
            return await this.sendCommand(payload)
        }
        else if (this.getExperimentState() === "RUNNING") {
            logger.warn("cannot unpause a running simulation")
        }
    }

    /**
     * Pauses the experiment specified.
     * @param exp_id optionnal parameter, will default to last used experiment
     */
    async pause(exp_id?: string): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Pause,
            "exp_id": this.getId(exp_id)
        }
        this.pauseRequested = true;
        try {
            return await this.sendCommand(payload)
        } finally {
            this.pauseRequested = false;
        }
    }

    async reload(exp_id?: string, parameters?: GamaParameter[], until?: string): Promise<GamaMessage> {
        this.socketCheck()
        await this.awaitPausedIfNotReady()
        const payload = buildPayload({
            "type": CommandTypes.Reload,
            "exp_id": this.getId(exp_id),
        }, {
            parameters: parameters && parameters.length > 0 ? parameters : undefined,
            until: until ? until : undefined,
        });

        return await this.sendCommand(payload)
    }





    /**
     * Sends a message to gama to order it to process a specified number of steps.
     * Can only be used after the simulation has already been loaded.
     * @param nb_step Number of steps to execute. Defaults to 1 (only sent to server when > 1).
     * @param sync If true gama-server waits for steps to finish before sending a success message. Defaults to false.
     * @param exp_id Experiment id. Defaults to last used experiment.
     */
    async step(nb_step: number = 1, sync: boolean = false, exp_id?: string): Promise<GamaMessage> {
        this.socketCheck()
        await this.awaitPausedIfNotReady()
        const payload = buildPayload({
            "type": CommandTypes.Step,
            "exp_id": this.getId(exp_id),
            "sync": sync,
        }, { nb_step: nb_step > 1 ? nb_step : undefined });

        return await this.sendCommand(payload)
    }


    /** 
     * ! you must be sure that the type of the experiment is compatible (record) before using this
     * This command is used to rollback a specific amount of steps.
     * Can only be used if the experiment is of type "record"
     * @param exp_id  the name of the experiment you want to step to. if not used, then the last used experiment Id will be used
     * @param nb_step  the number of steps you want to simulate. if none is specified, it will default to one step
     */

    async stepBack(nb_step: number = 1, sync?: boolean, exp_id?: string): Promise<GamaMessage> {
        this.socketCheck()
        const payload = buildPayload({
            "type": CommandTypes.StepBack,
            "exp_id": this.getId(exp_id),
        }, { sync, nb_step: nb_step > 1 ? nb_step : undefined });

        return await this.sendCommand(payload)
    }


    /**
     * @deprecated Use {@link stepBack}, which matches the wire command and the python
     * client's `step_back`. This spelling is kept so existing callers keep working and
     * will be removed in the next major.
     */
    async stepback(nb_step: number = 1, sync?: boolean, exp_id?: string): Promise<GamaMessage> {
        return await this.stepBack(nb_step, sync, exp_id);
    }

    /**
     * stops the specified experiment or the current experiment if not specified
     * @param exp_id optionnal parameter, leave empty to use the last used exp_id
     */
    async stop(exp_id?: string): Promise<GamaMessage | undefined> {
        this.socketCheck()
        if (this.getExperimentState() !== "NONE") {
            this.pauseRequested = true;
            try {
                const payload = {
                    "type": CommandTypes.Stop,
                    "exp_id": this.getId(exp_id)
                }
                const response = await this.sendCommand(payload)
                // Stopping a RUNNING experiment makes gama-server emit a trailing
                // SimulationStatus of "PAUSED" around the "NONE", which leaves the client
                // reporting PAUSED for an experiment that is actually gone — commands sent
                // afterwards get "Unable to find the experiment or simulation". The server
                // has acknowledged the stop here, so NONE is the truthful state whatever the
                // last status said. Builds disagree on whether that trailing frame arrives
                // before or after the acknowledgement, so dropping the experiment id is what
                // makes this order-independent: the status listener ignores frames once this
                // client owns no experiment. See issues #28 and #29.
                this.setExperimentState("NONE");
                this.setExperimentId("");
                this.interrupted = false;
                return response;
            } catch (error) {
                throw new Error(`couldn't stop the experiment:${error}`);
            } finally {
                this.pauseRequested = false;
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
            const parsed = parseMessage(event.data);
            if (parsed === undefined) {
                logger.warn('Received non-JSON message:{data}', { data: event.data });
                return;
            }
            callback(parsed);
        });
    }



    /**
     * Kills the gama server. Closes the websocket connection and shuts down the gama instance.
     * No response is sent back by the server.
     */
    async exit(): Promise<void> {
        this.socketCheck()
        const payload = { "type": CommandTypes.Exit }
        this.sendPayload(payload)
    }

    /**
     * Evaluates a GAML expression inside the running experiment.
     * @param expr The GAML expression to evaluate
     * @param exp_id Optional experiment id, defaults to last used experiment
     * @returns The result of the evaluation
     */
    async expression(expr: string, exp_id?: string): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Expression,
            "exp_id": this.getId(exp_id),
            "expr": expr
        }
        return await this.sendCommand(payload)
    }

    /**
     * Downloads a file from the gama-server file system.
     * @param file_path Path of the file to download on the server's file system
     * @returns The file content as a string
     */
    async download(file_path: string): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Download,
            "file": file_path
        }
        return await this.sendCommand(payload)
    }

    /**
     * Uploads a file to the gama-server file system.
     * @param file_path Destination path on the server's file system
     * @param content The content of the file to upload
     */
    async upload(file_path: string, content: string): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Upload,
            "file": file_path,
            "content": content
        }
        return await this.sendCommand(payload)
    }

    /**
     * used to run execute an action defined in an agent in an experiment.
     *
     * Note: gama-server does not send the action's return value back, the answer's
     * content is always empty. To read a value out of the simulation, use
     * {@link expression} instead.
     * @param action name of the action to call
     * @param args arguments of the action, either an object or a JSON object string. Defaults to no argument
     * @param agent optional reference of the agent the action is called on, as `species[index]` segments
     *              separated by dots, starting at the simulation: `simulation[0]`, `simulation[0].people[42]`, ...
     *              This is *not* a species or variable name, so `"world"` is invalid. Omitting it makes gama-server
     *              target the *experiment* agent, which does not hold the actions declared in `global`: pass
     *              `"simulation[0]"` to call those
     * @param escaped optional parameter, if true will escape the action and args before sending them to gama
     * @param exp_id optionnal parameter to specify the experiment. if none is given it will instead default to the last used experiment
     * @returns a stringified response containing the result of the execution of the command
     */
    async ask(
        action: string,
        args: string | Record<string, unknown> = {},
        agent?: string,
        escaped: boolean = false,
        exp_id?: string
    ): Promise<GamaMessage> {
        this.socketCheck()

        if (agent !== undefined && !isAgentReference(agent)) {
            throw new Error(`ask(): '${agent}' is not a valid agent reference. Expected \`species[index]\` segments separated by dots and starting at the simulation, for instance "simulation[0]" for an action declared in \`global\`, or "simulation[0].people[42]" for one declared in a species.`);
        }

        // gama-server falls back to the experiment agent only when 'agent' is absent:
        // an empty string is still parsed as a reference and crashes the server.
        const payload = buildPayload({
            "type": CommandTypes.Ask,
            "exp_id": this.getId(exp_id),
            "action": action,
            "args": normaliseAskArgs(args),
            "escaped": escaped
        }, { agent });

        return await this.sendCommand(payload);
    }
    /**
     * Compiles the code given in parameter and returns a message if any errors are detected.
     * @param expr gaml expression to test
     * @param syntax optionnal boolean, if true will only check the syntax. false will check for both syntactical and semantic errors
     * @param escaped optionnal boolean, dictates if the expression is escaped or not
     * @returns stringified json containing errors in the code if any
     */
    async validate(expr: string, syntax: boolean = false, escaped: boolean = false): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Validate,
            "expr": expr,
            "syntax": syntax,
            "escaped": escaped
        }
        return await this.sendCommand(payload)
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
    ): Promise<GamaMessage> {
        this.socketCheck()
        const payload = {
            "type": CommandTypes.Describe,
            "model": model_path,
            "experiments": experimentsNames,
            "speciesNames": speciesNames,
            "speciesVariables": speciesVariables,
            "speciesActions": speciesActions
        }
        return await this.sendCommand(payload)
    }
}










