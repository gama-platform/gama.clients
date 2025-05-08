import asyncio
import argparse
from pathlib import Path

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

async def main():
    """
    This example shows how to perform a certain number of steps in a Gama experiment using the GamaSyncClient.
    First it connects to the server and loads the model.
    Then it runs the experiment for a given number of steps and closes the connection.
    It also prints the current step number before and after running the steps.
    """

    # Experiment and Gama-server constants
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
    parser.add_argument("-p", "--port", help="Gama server port", default=6868)
    args = parser.parse_args()

    gaml_file_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
    exp_name = "ex"

    client = GamaSyncClient(args.url, args.port)

    print("connecting to Gama server")
    try:
        client.sync_connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return

    print("loading a gaml model")
    gama_response = client.sync_load(gaml_file_path, exp_name, False, False, False, True)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while loading", gama_response)
        return
    print("initialization successful")
    experiment_id = gama_response["content"]

    gama_response = client.sync_expression(experiment_id, r"cycle")
    print("asking simulation the value of: cycle =", gama_response["content"])

    print("asking gama to run 10 steps of the experiment")
    gama_response = client.sync_step(experiment_id, 10, sync=True)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return
    
    gama_response = client.sync_expression(experiment_id, r"cycle")
    print("asking simulation the value of: cycle =", gama_response["content"])

    client.sync_close_connection()

if __name__ == "__main__":
    asyncio.run(main())