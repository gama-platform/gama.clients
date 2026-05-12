import asyncio
import unittest
from asyncio import Future
from typing import Dict, Any, List, Awaitable

from gama_client.async_client import GamaAsyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestPlayPauseStopAsync(unittest.IsolatedAsyncioTestCase):

    client: GamaAsyncClient
    future_command1: Future
    sim_id: List[str]

    async def message_handler(self, message: Dict[str, Any]):
        if not self.future_command1.done() and not self.future_command1.cancelled():
            self.future_command1.set_result(message)

    async def wait_for_future(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await asyncio.wait_for(awaitable, timeout=timeout)
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def asyncSetUp(self):
        self.client = GamaAsyncClient(url, port, self.message_handler)
        await self.wait_for_future(self.client.connect_async())
        self.future_command1 = Future()
        self.sim_id = []

    async def test_play(self):
        await self.client.load_async(empty_model_path, "ex")
        gama_response = await self.wait_for_future(self.future_command1)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.future_command1 = Future()
        await self.client.play_async(exp_id)
        play_res = await self.wait_for_future(self.future_command1)
        self.assertEqual(play_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_pause(self):
        await self.client.load_async(empty_model_path, "ex")
        gama_response = await self.wait_for_future(self.future_command1)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.future_command1 = Future()
        await self.client.play_async(exp_id)
        await self.wait_for_future(self.future_command1)

        self.future_command1 = Future()
        await self.client.pause_async(exp_id)
        pause_res = await self.wait_for_future(self.future_command1)
        self.assertEqual(pause_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_stop(self):
        await self.client.load_async(empty_model_path, "ex")
        gama_response = await self.wait_for_future(self.future_command1)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.future_command1 = Future()
        await self.client.stop_async(exp_id)
        stop_res = await self.wait_for_future(self.future_command1)
        self.assertEqual(stop_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                await self.client.stop_async(id)
            except Exception:
                pass
        await self.client.close_connection_async()

if __name__ == '__main__':
    unittest.main()
