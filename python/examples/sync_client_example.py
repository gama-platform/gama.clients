import asyncio
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
    gaml_file_path = str(Path(__file__).parents[0] / "predatorPrey.gaml")
    exp_name = "prey_predator"
    exp_parameters = [{"type": "int", "name": "nb_preys_init", "value": 100}]

    client = GamaSyncClient(server_url, server_port, async_command_answer_handler, gama_server_message_handler)

    print("connecting to Gama server")
    await client.connect()

    print("initialize a gaml model")
    gama_response = client.sync_load(gaml_file_path, exp_name, True, True, True, True, parameters=exp_parameters)
    try:
        experiment_id = gama_response["content"]
    except Exception as e:
        print("error while initializing", gama_response, e)
        return

    print("initialization successful, running the model")
    gama_response = client.sync_play(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return

    print("pausing the model")
    gama_response = client.sync_pause(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to pause the experiment", gama_response)
        return

    gama_response = client.sync_expression(experiment_id, r"cycle")
    print("asking simulation the value of: cycle=", gama_response["content"])

    gama_response = client.sync_expression(experiment_id, r"nb_preys/nb_preys_init")
    print("asking simulation the value of: nb_preys/nb_preys_init=",  gama_response["content"])

    print("asking gama to run 10 more steps of the experiment")
    gama_response = client.sync_step(experiment_id, 100, True)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to execute 10 new steps in the experiment", gama_response)
        return

    gama_response = client.sync_expression(experiment_id, r"cycle")
    print("asking simulation the value of: cycle=", gama_response["content"])

    print("making async calls (non-blocking)")
    print("asking to execute 500 steps async")
    await client.step(experiment_id, 500, False)
    print("waiting 2sec")
    await asyncio.sleep(2)
    print("asking current cycle (async)")
    await client.expression(experiment_id, "cycle")

    print("everything done, waiting 20sec to simulate some other process running")
    await asyncio.sleep(20)

    print("killing the simulation")
    gama_response = client.sync_stop(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to stop the experiment", gama_response)
        return

    print("closing socket just to be sure")
    client.sync_close_connection()


if __name__ == "__main__":
    asyncio.run(main())
