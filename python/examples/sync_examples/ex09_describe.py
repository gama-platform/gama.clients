import asyncio
import argparse
from pathlib import Path

from gama_client.sync_client import GamaSyncClient

async def main():
    """
    This example shows how to ask the Gama server to describe a model using the GamaSyncClient.
    It first connects to the server and then ask the description of the model.
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
        client.connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return

    print("describing a gama model")
    gama_response = client.describe(gaml_file_path)
    try:
        description = gama_response["content"]
    except Exception as e:
        print("error while describing the model", gama_response, e)
    print(description)

    print("closing connection")
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())