import asyncio
import argparse
from pathlib import Path

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

async def main():
    """
    This example shows how to use expressions in a Gama experiment using the GamaSyncClient.
    First it connects to the server and loads the model.
    Then it prints the value of a species parameter and closes the connection.
    """

    # Experiment and Gama-server constants
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
    parser.add_argument("-p", "--port", help="Gama server port", default=6868)
    args = parser.parse_args()

    gaml_file_path = str(Path(__file__).parents[1] / "gaml/simple.gaml")
    exp_name = "ex"

    client = GamaSyncClient(args.url, args.port)

    print("connecting to Gama server")
    try:
        client.connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return

    print("loading a gaml model")
    gama_response = client.load(gaml_file_path, exp_name, False, False, False, True)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while loading", gama_response)
        return
    print("initialization successful")
    experiment_id = gama_response["content"]

    gama_response = client.expression(experiment_id, r"simple_agent[0].arg")
    print("asking simulation the value of: simple_agent[0].arg =", gama_response["content"])

    print("killing the experiment")
    gama_response = client.stop(experiment_id)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Unable to stop the experiment", gama_response)
        return
    print("experiment stopped")

    print("closing connection")
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())