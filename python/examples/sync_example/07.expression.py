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
    client.sync_connect()

    print("initialize a gaml model")
    gama_response = client.sync_load(gaml_file_path, exp_name, False, False, False, True)
    try:
        experiment_id = gama_response["content"]
    except Exception as e:
        print("error while initializing", gama_response, e)

    print("initialization successful")

    gama_response = client.sync_expression(experiment_id, r"simple_agent[0].arg")
    print("asking simulation the value of: simple_agent[0].arg =", gama_response["content"])

    client.sync_close_connection()

if __name__ == "__main__":
    asyncio.run(main())