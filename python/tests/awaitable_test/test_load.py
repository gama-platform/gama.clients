import asyncio
import unittest
from typing import Dict, Any, Awaitable

from gama_client.message_types import MessageTypes
from gama_client.sync_client import GamaSyncClient
from gaml_paths import MODEL_EMPTY as empty_model_path, MODEL_TEST as model_test_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=DEFAULT_TIMEOUT)
        await self.client.connect_awaitable()
        self.addAsyncCleanup(self.client.close_connection_async)

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_load(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex", timeout=DEFAULT_TIMEOUT))
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value



    async def test_load_set_seed(self):
        response = await self.client.load_awaitable(model_test_path, "ex", seed=123)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = response["content"]
        self.addAsyncCleanup(self.client.stop_awaitable, exp_id)

        response = await self.client.expression_awaitable(exp_id, "seed")
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(response["content"], 123)


if __name__ == '__main__':
    unittest.main()


