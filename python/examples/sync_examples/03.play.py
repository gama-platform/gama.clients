import asyncio
import argparse
from pathlib import Path

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

async def main():
    """
    This example shows how to run a Gama experiment using the GamaSyncClient.
    It first connects to the server, loads the model, and then runs the experiment.
    It also handles errors that may occur during the process.
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

    print("running the model for 1 second")
    gama_response = client.sync_play(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return
    
    await asyncio.sleep(1)

    print("closing the connection")
    client.sync_close_connection()

if __name__ == "__main__":
    asyncio.run(main())