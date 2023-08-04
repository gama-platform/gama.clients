# tests the new functionalities of uploading/downloading and closing the connection

import asyncio
from asyncio import Future
from pathlib import Path
from typing import Dict

from gama_client.base_client import GamaBaseClient
from gama_client.command_types import CommandTypes
from gama_client.message_types import MessageTypes

download_future: Future
upload_future: Future
load_future: Future


async def message_handler(message: Dict):
    print("received", message)
    if "command" in message:
        if message["command"]["type"] == CommandTypes.Download.value:
            download_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Upload.value:
            upload_future.set_result(message)
        elif message["command"]["type"] == CommandTypes.Load.value:
            load_future.set_result(message)


async def main():
    global download_future, upload_future, load_future

    client = GamaBaseClient("localhost", 6868, message_handler)
    await client.connect()

    file_to_download = str(Path(__file__).parents[0] / "file_to_download.txt")
    file_to_upload = str(Path(__file__).parents[0] / "uploaded.txt")
    gaml_model = str(Path(__file__).parents[0] / "test_gaml_file.gaml")

    download_future = asyncio.get_running_loop().create_future()
    upload_future = asyncio.get_running_loop().create_future()
    load_future = asyncio.get_running_loop().create_future()

    await client.download(file_to_download)
    ftd_content = await download_future
    if ftd_content["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to download a file", ftd_content)
        return
    print("file downloaded successfully from gama-server, here is its content:", ftd_content["content"])

    await client.upload(file_to_upload, "here is my secret:\n\n\n\n\n\n\n\n\n\nGOTCHA")
    up_result = await upload_future
    if up_result["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to upload a file", up_result)
        return
    # after that, a new file should have appeared next to this code file, containing our text
    print("upload successful, about to close connection and do other stuff now")

    await client.close_connection()

    # leave some time to check on gs if correctly disconnected
    await asyncio.sleep(15)

    # reconnect and execute a random command to check that everything is fine
    await client.connect()
    await client.load(gaml_model, "name")
    load_result = await upload_future
    if load_result["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("error while trying to load the gaml model", load_result)
        return

    print("everything worked as expected, exiting the program")

if __name__ == "__main__":
    asyncio.run(main())
