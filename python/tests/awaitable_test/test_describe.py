import asyncio
import unittest
from typing import Dict, Any, Awaitable

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10

class TestDescribeAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=DEFAULT_TIMEOUT)
        self.client.connect()

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_describe(self):
        desc_res = await self.wait_for_response(self.client.describe_awaitable(empty_model_path))
        self.assertEqual(desc_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertIn("content", desc_res)

    async def asyncTearDown(self):
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
