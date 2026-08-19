export const WS_READY_STATE = {
    CONNECTING: 0,
    OPEN:       1,
    CLOSING:    2,
    CLOSED:     3,
} as const;

export type ExperimentState = "NONE" | "RUNNING" | "PAUSED" | "NOTREADY";

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

export interface JsonPlayerAsk {
    type: string;
    action: string;
    args: string;   // JsonConvert.SerializeObject(Dictionary<string, string>)
    agent: string;
}

/** Key added to every outgoing command so its answer can be matched back to it.
 *  gama-server echoes unknown fields verbatim inside `command`, which is what makes
 *  this work; without it a late or duplicated answer is picked up by whichever
 *  command happens to be waiting next. */
export const CLIENT_COMMAND_ID = "client_command_id";

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
]


