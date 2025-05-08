import asyncio
import argparse

from gama_client.sync_client import GamaSyncClient

async def main():
    """
    This example shows how to connect to a Gama server and close the connection using the GamaSyncClient.
    It first connects to the server and then closes the connection.
    """

    # Experiment and Gama-server constants
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
    parser.add_argument("-p", "--port", help="Gama server port", default=6868)
    args = parser.parse_args()

    client = GamaSyncClient(args.url, args.port)

    print("connecting to Gama server")
    try:
        client.connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return
    print("connection successful")

    print("closing the connection")
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())