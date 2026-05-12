import asyncio
import unittest
from typing import Dict, Any, List, Awaitable

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestExpressionAwaitable(unittest.IsolatedAsyncioTestCase):

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

    async def test_expression_cycle(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        expr_res = await self.wait_for_response(self.client.expression_awaitable(exp_id, "cycle"))
        self.assertEqual(expr_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expr_res["content"], 0)

    async def test_expression_arithmetic(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        expr_res = await self.wait_for_response(self.client.expression_awaitable(exp_id, "1 + 1"))
        self.assertEqual(expr_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expr_res["content"], 2)

    async def test_expression_error(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex"))
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        expr_res = await self.wait_for_response(self.client.expression_awaitable(exp_id, "variable_does_not_exist"))
        self.assertEqual(expr_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                await self.client.stop_awaitable(id)
            except Exception:
                pass
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
