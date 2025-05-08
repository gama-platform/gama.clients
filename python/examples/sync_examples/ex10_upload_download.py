import asyncio
import argparse

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

async def main():
    """
    This example shows how to upload and download a file from the Gama server using the GamaSyncClient.
    It first uploads a file "file.txt" to the server, then downloads it back and prints its content.
    The file while be uploaded in the root directory of the Gama server (C:\\Program Files\\Gama\\headless if local).
    """

    # Experiment and Gama-server constants
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
    parser.add_argument("-p", "--port", help="Gama server port", default=6868)
    args = parser.parse_args()

    file = str("file.txt")
    text = "Hello World!\nmultiple lines\n\nthat's awsome"

    client = GamaSyncClient(args.url, args.port)

    print("connecting to Gama server")
    try:
        client.connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return

    print("uploading file to gama-server")
    gama_response = client.upload(file, text)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to upload the file", gama_response)
        return
    print("file uploaded successfully")

    print("downloading file from gama-server");
    gama_response = client.download(file)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to download the file", gama_response)
        return
    print("file downloaded successfully, here is the content:")
    print(gama_response["content"])

    print("closing connection")
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())