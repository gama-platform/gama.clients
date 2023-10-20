import asyncio
from asyncio import Future
from pathlib import Path
from typing import Dict

from gama_client.base_client import GamaBaseClient
from gama_client.command_types import CommandTypes
from gama_client.message_types import MessageTypes

experiment_future: Future
play_future: Future
pause_future: Future
expression_future: Future
step_future: Future
step_back_future: Future
stop_future: Future


async def message_handler(message: Dict):
    print("received", message)
    if "command" in message:
        if message["command"]["type"] == CommandTypes.Load.value:
            experiment_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Play.value:
            play_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Pause.value:
            pause_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Expression.value:
            expression_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Step.value:
            step_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.StepBack.value:
            step_back_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Stop.value:
            stop_future.set_result(message)

async def main():

    global experiment_future
    global play_future
    global pause_future
    global expression_future
    global step_future
    global step_back_future
    global stop_future

    # Experiment and Gama-server constants
    server_url = "localhost"
    server_port = 6868
    gaml_file_path = str(Path(__file__).parents[0] / "predatorPrey.gaml")
    exp_name = "prey_predator"
    exp_parameters = [{"type": "int", "name": "nb_preys_init", "value": 100}]

    client = GamaBaseClient(server_url, server_port, message_handler)

    print("connecting to Gama server")
    await client.connect()

    print("initialize a gaml model")
    experiment_future = asyncio.get_running_loop().create_future()
    await client.load(gaml_file_path, exp_name, True, True, True, True, exp_parameters)
    gama_response = await experiment_future

    try:
        experiment_id = gama_response["content"]
    except Exception as e:
        print("error while initializing", gama_response, e)
        return

    print("initialization successful, running the model")
    play_future = asyncio.get_running_loop().create_future()
    await client.play(experiment_id)
    gama_response = await play_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return

    print("pausing the model")
    pause_future = asyncio.get_running_loop().create_future()
    await client.pause(experiment_id)
    gama_response = await pause_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to pause the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression(experiment_id, r"nb_preys/nb_preys_init")
    gama_response = await expression_future
    print("asking simulation the value of: nb_preys/nb_preys_init=",  gama_response["content"])

    print("asking gama to run 100 more steps of the experiment")
    step_future = asyncio.get_running_loop().create_future()
    await client.step(experiment_id, 100, True)
    gama_response = await step_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 10 new steps in the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    print("asking gama to run 5 steps backwards")
    step_back_future = asyncio.get_running_loop().create_future()
    await client.step_back(experiment_id, 5, True)
    gama_response = await step_back_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 5 steps back", gama_response)
        return

    print("asking gama to run 1 more steps of the experiment")
    step_future = asyncio.get_running_loop().create_future()
    await client.step(experiment_id, 1, True)
    gama_response = await step_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 10 new steps in the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    print("killing the simulation")
    stop_future = asyncio.get_running_loop().create_future()
    await client.stop(experiment_id)
    gama_response = await stop_future

if __name__ == "__main__":
    asyncio.run(main())
