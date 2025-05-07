import asyncio
import argparse
from pathlib import Path

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

async def main():
    """
    This example shows how to stop a Gama experiment using the GamaSyncClient.
    It first connects to the server, loads the model, and then runs the experiment.
    Then it pauses the experiment and closes the connection.
    It also prints the number of cycles run before pausing.
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
    client.sync_connect()

    print("initialize a gaml model")
    gama_response = client.sync_load(gaml_file_path, exp_name, False, False, False, True)
    try:
        experiment_id = gama_response["content"]
    except Exception as e:
        print("error while initializing", gama_response, e)

    print("initialization successful")
    print("running the model")
    gama_response = client.sync_play(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to run the experiment", gama_response)
        return
    
    await asyncio.sleep(1)

    print("pausing the model")
    gama_response = client.sync_pause(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to pause the experiment", gama_response)
        return
    
    gama_response = client.sync_expression(experiment_id, r"cycle")
    print("asking simulation the value of: cycle =", gama_response["content"])

    client.sync_close_connection()

if __name__ == "__main__":
    asyncio.run(main())