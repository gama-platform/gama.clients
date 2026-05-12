import asyncio
import unittest
from asyncio import Future
from typing import Dict, Any, List, Awaitable

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import (
    MODEL_RUNTIME_ERROR as runtime_error_model_path,
    MODEL_EMPTY as empty_model_path,
    MODEL_SLOW as slow_model_path
)

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestStepAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    future_console: Future
    sim_id: List[str]

    async def message_handler(self, message: Dict[str, Any]):
        if message["type"] == MessageTypes.SimulationOutput.value or message["type"] == MessageTypes.SimulationError.value:
            if not self.future_console.done():
                self.future_console.set_result(message)

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, other_message_handler=self.message_handler, default_timeout=DEFAULT_TIMEOUT)
        self.client.connect()
        self.future_console = Future()
        self.sim_id = []

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_step_sync(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = await self.wait_for_response(self.client.step_awaitable(exp_id, sync=True))
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        expression_val = await self.wait_for_response(self.client.expression_awaitable(exp_id, "cycle"))
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    async def test_step_async(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = await self.wait_for_response(self.client.step_awaitable(exp_id, sync=False))
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_multiple_steps(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        for _ in range(5):
            await self.wait_for_response(self.client.step_awaitable(exp_id, sync=True))
        
        expression_val = await self.wait_for_response(self.client.expression_awaitable(exp_id, "cycle"))
        self.assertEqual(expression_val["content"], 5)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                await self.client.stop_awaitable(id)
            except Exception:
                pass
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
