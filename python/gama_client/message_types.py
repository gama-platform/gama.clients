from enum import Enum


class MessageTypes(Enum):

    ConnectionSuccessful        = "ConnectionSuccessful"
    SimulationStatus            = "SimulationStatus"
    SimulationStatusInform      = "SimulationStatusInform"
    SimulationStatusError       = "SimulationStatusError"
    SimulationStatusNeutral     = "SimulationStatusNeutral"
    SimulationOutput            = "SimulationOutput"
    SimulationDebug             = "SimulationDebug"
    SimulationDialog            = "SimulationDialog"
    SimulationErrorDialog       = "SimulationErrorDialog"
    SimulationError             = "SimulationError"
    RuntimeError                = "RuntimeError"
    GamaServerError             = "GamaServerError"
    MalformedRequest            = "MalformedRequest"
    CommandExecutedSuccessfully = "CommandExecutedSuccessfully"
    SimulationEnded             = "SimulationEnded"
    UnableToExecuteRequest      = "UnableToExecuteRequest"
