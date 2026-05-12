import asyncio
import json
from pathlib import Path
from typing import Dict

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


async def async_command_answer_handler(message: Dict):
    print("Here is the answer to an async command: ", message)


async def gama_server_message_handler(message: Dict):
    print("I just received a message from Gama-server and it's not an answer to a command!")
    print("Here it is:", message)


async def main():

    # Experiment and Gama-server constants
    server_url = "localhost"
    server_port = 6868
    gaml_file_path = str(Path(__file__).parents[1] / "gaml" / "complete.gaml")

    exp_name = "ex"
    exp_parameters = []

    client = GamaSyncClient(server_url, server_port, async_command_answer_handler, gama_server_message_handler)

    print("connecting to Gama server")
    client.connect()


    print("Asking information about the model we want to run")
    ret = client.describe(gaml_file_path, True, True)
    print("The model located at '", gaml_file_path, "' contains: ", ret)

    print("This is the model we want, now we will initialize it")
    gama_response = client.load(gaml_file_path, exp_name, True, True, True, True, parameters=exp_parameters)
    try:
        experiment_id = gama_response["content"]
        print("Model successfully initialized, experiment id: ", experiment_id)
    except Exception as e:
        print("error while initializing", gama_response, e)
        return

    print("Now running the model freely for a bit")
    gama_response = client.play(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return
    
    await asyncio.sleep(2)

    print("Pausing the model")
    gama_response = client.pause(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to pause the experiment", gama_response)
        return
    
    print("Asking for current cycle value")
    gama_response = client.expression(experiment_id, "cycle")
    print("Current cycle value: ", gama_response["content"])
    print("Getting current population using length(people)")
    gama_response = client.expression(experiment_id, "length(people)")
    print("Current population: ", gama_response["content"])
    

    print("Asking gama to run 100 more steps of the experiment")
    for i in range(100):
        gama_response = client.step(experiment_id, 100, False)
        if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
            print("Unable to execute 100 new steps in the experiment", gama_response)
            return

    gama_response = client.expression(experiment_id, "cycle")
    print("Checking that we are at the correct cycle", gama_response["content"])

    print("Everything done, closing the simulation")
    gama_response = client.stop(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to stop the experiment", gama_response)
        return
    
    print("Closing the socket just to be clean, but not necessary")
    client.close_connection()


if __name__ == "__main__":
    asyncio.run(main())
