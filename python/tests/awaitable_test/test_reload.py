import asyncio
import unittest
from typing import Dict, Any, List, Awaitable

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestReloadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    sim_id: List[str]

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=DEFAULT_TIMEOUT)
        await self.client.connect_awaitable()
        self.sim_id = []

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_reload(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Run one step
        await self.wait_for_response(self.client.step_awaitable(exp_id, sync=True))
        
        # Reload
        reload_res = await self.wait_for_response(self.client.reload_awaitable(exp_id))
        self.assertEqual(reload_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        
        # Check cycle is 0 again
        expr_res = await self.wait_for_response(self.client.expression_awaitable(exp_id, "cycle"))
        self.assertEqual(expr_res["content"], 0)

    async def test_reload_manual_seed_changing(self):
        response = await self.client.load_awaitable(empty_model_path, "ex", seed=321)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = response["content"]
        self.sim_id.append(exp_id)

        response = await self.client.reload_awaitable(exp_id, seed=123)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        response = await self.client.expression_awaitable(exp_id, "seed")
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(response["content"], 123)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                await self.client.stop_awaitable(id)
            except Exception:
                pass
        await self.client.close_connection_async()

if __name__ == '__main__':
    unittest.main()
