from enum import Enum


class CommandTypes(Enum):

    Exit        = "exit"
    Load        = "load"
    Play        = "play"
    Pause       = "pause"
    Step        = "step"
    StepBack    = "stepBack"
    Reload      = "reload"
    Stop        = "stop"
    Expression  = "expression"
    Download    = "download"
    Upload      = "upload"
