import asyncio
from asyncio import Future
from pathlib import Path
from typing import Dict

from gama_client.command_types import CommandTypes

from gama_client.base_client import GamaBaseClient

load_future: Future

async def message_handler(message: Dict):
    global load_future
    print("received", message)
    if "command" in message.keys() and message["command"]["type"] == CommandTypes.Load.value:
        load_future.set_result(message)


async def main(gaml_file, experiment):
    global load_future
    MY_EXP_INIT_PARAMETERS = [
       # {"type": "list<int>", "nameeee": "closed_roads", "value": [1,2,3]},
        {"type": "list<int>", "name": "closed_roads", "value": [1, 2, 3]},
    ]
    client = GamaBaseClient("localhost", 6868, message_handler)
    await client.connect(False, ping_interval=None)

    load_future = asyncio.get_running_loop().create_future()
    await client.load(gaml_file, experiment, parameters=MY_EXP_INIT_PARAMETERS)
    res = await load_future

    # Loads a new experiment with proper parameters this time
    load_future = asyncio.get_running_loop().create_future()
    await client.load(gaml_file, experiment)
    res = await load_future

    await client.reload(res["content"], parameters=[{"valueZ":"hehe"}])

    await client.load(gaml_file, experiment)
    await client.load(gaml_file, experiment)
    await client.load(gaml_file, experiment)
    await client.load(gaml_file, experiment)

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main(gaml_file=str(Path(__file__).parents[0] / "multiple_clients.gaml"),
                     experiment="exp"))
