export const WS_READY_STATE = {
    CONNECTING: 0,
    OPEN:       1,
    CLOSING:    2,
    CLOSED:     3,
} as const;

export type ExperimentState = "NONE" | "RUNNING" | "PAUSED" | "NOTREADY";

export interface GamaMessage {
    type: string;
    content?: string;
    exp_id?: string;
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


