import asyncio
import unittest
from typing import Dict, Any, List, Awaitable
from asyncio import Future

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestPlayPauseStopAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    sim_id: List[str]

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=DEFAULT_TIMEOUT)
        self.client.connect()
        self.sim_id = []

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_play(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        play_res = await self.wait_for_response(self.client.play_awaitable(exp_id))
        self.assertEqual(play_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_pause(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        await self.wait_for_response(self.client.play_awaitable(exp_id))
        pause_res = await self.wait_for_response(self.client.pause_awaitable(exp_id))
        self.assertEqual(pause_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_stop(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        stop_res = await self.wait_for_response(self.client.stop_awaitable(exp_id))
        self.assertEqual(stop_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        # Should not be able to play after stop
        play_res = await self.wait_for_response(self.client.play_awaitable(exp_id))
        self.assertEqual(play_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_play_not_loaded(self):
        play_res = await self.wait_for_response(self.client.play_awaitable("fake_id"))
        self.assertEqual(play_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_pause_not_loaded(self):
        pause_res = await self.wait_for_response(self.client.pause_awaitable("fake_id"))
        self.assertEqual(pause_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_stop_not_loaded(self):
        stop_res = await self.wait_for_response(self.client.stop_awaitable("fake_id"))
        self.assertEqual(stop_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                await self.client.stop_awaitable(id)
            except Exception:
                pass
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
