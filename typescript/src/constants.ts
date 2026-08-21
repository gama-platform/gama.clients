export const WS_READY_STATE = {
    CONNECTING: 0,
    OPEN:       1,
    CLOSING:    2,
    CLOSED:     3,
} as const;

export type ExperimentState = "NONE" | "RUNNING" | "PAUSED" | "NOTREADY";

/** Where a client connects when the constructor is not told otherwise. */
export const DEFAULT_PORT = 1000;
export const DEFAULT_HOST = "localhost";

/** How long each kind of wait is given, in milliseconds.
 *  These are the values the client has always used, gathered rather than retuned:
 *  `answer` covers model compilation on `load`, so shortening it changes which models
 *  load successfully. */
export const TIMEOUTS = {
    /** waiting for the answer to a command */
    answer: 30_000,
    /** waiting for a particular frame, such as a status change */
    listen: 15_000,
    /** waiting for the socket to close */
    close:  15_000,
} as const;

export interface GamaMessage {
    type: string;
    /** Answers carry the command's result here. Its shape follows the command:
     *  a string for `load`, a number for `expression("1+1")`, an array for a list-returning
     *  expression, a nested object for `describe`, ... hence `unknown` rather than `string`. */
    content?: unknown;
    exp_id?: string;
    /** gama-server echoes the command that produced this answer, custom fields included.
     *  Absent on unsolicited notifications such as SimulationStatus. */
    command?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface GamaState {
    connected: boolean;
    experiment_state: ExperimentState;
    loading: boolean;
    content_error: string;
    model_path: string;
    experiment_id: string;
    experiment_name: string;
}

/** Represents a single experiment parameter sent with load/reload commands.
 *  `value` matches the GAML type: number for int/float, string for string,
 *  or a plain object for rgb/compound types. */
export interface GamaParameter {
    type: string;
    value: unknown;
    name: string;
}

/**
 * gama-server identifies agents with an `AgentReference`, not with a species or
 * variable name. A reference is a dot-separated path of `species[index]` segments,
 * starting at the simulation: `simulation[0]`, `simulation[0].people[42]`, ...
 * Anything else (`world`, `people`, `""`, ...) makes the server throw an
 * ArrayIndexOutOfBoundsException instead of reporting a proper error, so the
 * client checks the format before sending the command.
 */
export const AGENT_REFERENCE_PATTERN = /^[A-Za-z_]\w*\[\d+\](\.[A-Za-z_]\w*\[\d+\])*$/;

/** Key added to every outgoing command so its answer can be matched back to it.
 *  gama-server echoes unknown fields verbatim inside `command`, which is what makes
 *  this work; without it a late or duplicated answer is picked up by whichever
 *  command happens to be waiting next. */
export const CLIENT_COMMAND_ID = "client_command_id";

/** Every command type gama-server accepts. Mirrors Python's CommandTypes enum, and keeps
 *  the wire spelling in one place: `stepBack` in particular is easy to mistype, and the
 *  client method that sends it is spelled differently again. */
export const CommandTypes = {
    Exit:       "exit",
    Load:       "load",
    Play:       "play",
    Pause:      "pause",
    Step:       "step",
    StepBack:   "stepBack",
    Reload:     "reload",
    Stop:       "stop",
    Expression: "expression",
    Download:   "download",
    Upload:     "upload",
    Validate:   "validate",
    Describe:   "describe",
    Ask:        "ask",
} as const;

/** All message types that can be received from gama-server. Mirrors Python's MessageTypes enum. */
export const MessageTypes = {
    ConnectionSuccessful:       "ConnectionSuccessful",
    SimulationStatus:           "SimulationStatus",
    SimulationStatusInform:     "SimulationStatusInform",
    SimulationStatusError:      "SimulationStatusError",
    SimulationStatusNeutral:    "SimulationStatusNeutral",
    SimulationOutput:           "SimulationOutput",
    SimulationDebug:            "SimulationDebug",
    SimulationDialog:           "SimulationDialog",
    SimulationErrorDialog:      "SimulationErrorDialog",
    SimulationError:            "SimulationError",
    RuntimeError:               "RuntimeError",
    GamaServerError:            "GamaServerError",
    MalformedRequest:           "MalformedRequest",
    CommandExecutedSuccessfully: "CommandExecutedSuccessfully",
    SimulationEnded:            "SimulationEnded",
    UnableToExecuteRequest:     "UnableToExecuteRequest",
} as const;

export const GAMA_ERROR_MESSAGES = [
    MessageTypes.SimulationStatusError,
    MessageTypes.SimulationErrorDialog,
    MessageTypes.SimulationError,
    MessageTypes.RuntimeError,
    MessageTypes.GamaServerError,
    MessageTypes.MalformedRequest,
    MessageTypes.UnableToExecuteRequest,
] as const;
