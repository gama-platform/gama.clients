import asyncio
import json
import argparse
from pathlib import Path
from typing import Dict

from gama_client.async_client import GamaAsyncClient
from gama_client.command_types import CommandTypes
from gama_client.message_types import MessageTypes

"""
This script showcases the call of all the commands available in the GamaAsyncClient class and how to catch the answer 
messages sent by gama-server.
"""

async def message_handler(message: Dict):
    """
    Here we handle all the messages sent by gama-server. In this example we will wait for the answer to different
    commands sent by the client and print a different message accordingly.
    :param message: the message sent by gama-server
    """
    if "command" in message:
        if message["command"]["type"] == CommandTypes.Load.value:
            if "content" in message["command"].keys:
                print("Simulation loaded successfully, id:", message["command"]["content"])
            else:
                print("Cannot load the simulation:", message)
        elif message["command"]["type"] == CommandTypes.Play.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the Play command:", message)
            else:
                print("Play command has been executed successfully")
        elif message["command"]["type"] == CommandTypes.Pause.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the Pause command:", message)
            else:
                print("Pause command has been executed successfully")
        elif message["command"]["type"] == CommandTypes.Expression.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the Expression command:", message)
            else:
                print("Expression command has been executed successfully, here is the result:", message["content"])
        elif message["command"]["type"] == CommandTypes.Step.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the Step command:", message)
            else:
                print("Step command has been executed successfully")
        elif message["command"]["type"] == CommandTypes.StepBack.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the StepBack command:", message)
            else:
                print("StepBack command has been executed successfully")
        elif message["command"]["type"] == CommandTypes.Stop.value:
            if message["type"] != MessageTypes.CommandExecutedSuccessfully.value:
                print("Unable to run the Stop command:", message)
            else:
                print("Stop command has been executed successfully")
    elif message["type"] == MessageTypes.SimulationOutput.value:
        print("Message printed by the simulation: ", message["content"])
    else:
        print("Message not supported:", message)


async def main(url: str, port: int):

    # Experiment and Gama-server constants
    client = GamaAsyncClient(url, port, message_handler)
    gaml_file_path = str(Path(__file__).parents[1] / "gaml" / "complete.gaml")
    exp_name = "expe"


    print("connecting to Gama server")
    await client.connect_async()

    print("initialize a gaml model")
    await client.load_async(gaml_file_path, exp_name, True, False, False, True)

    await client.describe_async(gaml_file_path)


    print("initialization successful, running the model")
    play_future = asyncio.get_running_loop().create_future()
    await client.play_async(experiment_id)
    gama_response = await play_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return

    print("pausing the model")
    pause_future = asyncio.get_running_loop().create_future()
    await client.pause_async(experiment_id)
    gama_response = await pause_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to pause the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression_async(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression_async(experiment_id, r"nb_preys/nb_preys_init")
    gama_response = await expression_future
    print("asking simulation the value of: nb_preys/nb_preys_init=",  gama_response["content"])

    print("asking gama to run 100 more steps of the experiment")
    step_future = asyncio.get_running_loop().create_future()
    await client.step_async(experiment_id, 100, True)
    gama_response = await step_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 10 new steps in the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression_async(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    print("asking gama to run 5 steps backwards")
    step_back_future = asyncio.get_running_loop().create_future()
    await client.step_back_async(experiment_id, 5, True)
    gama_response = await step_back_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 5 steps back", gama_response)
        return

    print("asking gama to run 1 more steps of the experiment")
    step_future = asyncio.get_running_loop().create_future()
    await client.step_async(experiment_id, 1, True)
    gama_response = await step_future
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 10 new steps in the experiment", gama_response)
        return

    expression_future = asyncio.get_running_loop().create_future()
    await client.expression_async(experiment_id, r"cycle")
    gama_response = await expression_future
    print("asking simulation the value of: cycle=", gama_response["content"])

    print("killing the simulation")
    stop_future = asyncio.get_running_loop().create_future()
    await client.stop_async(experiment_id)
    gama_response = await stop_future

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="defines the url of the gama-server to connect to",
                        type=str, default="localhost")
    parser.add_argument("-p", "--port", help="defines the port of the gama-server to connect to",
                        type=int, default=6868)
    args = parser.parse_args()
    asyncio.run(main(args.url, args.port))
