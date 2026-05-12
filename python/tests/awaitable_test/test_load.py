import asyncio
import unittest
from typing import Dict, Any, Awaitable

from gama_client.message_types import MessageTypes
from gama_client.sync_client import GamaSyncClient
from gaml_paths import MODEL_EMPTY as empty_model_path, MODEL_LONG_INIT as long_init_model_path

url = "localhost"
port = 6868
DEFAULT_TIMEOUT = 10


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=DEFAULT_TIMEOUT)
        self.client.connect()

    async def wait_for_response(self, awaitable: Awaitable, timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
        try:
            return await awaitable
        except asyncio.TimeoutError:
            self.fail(f"Timeout reached: command did not respond within {timeout} seconds")

    async def test_load(self):
        gama_response = await self.wait_for_response(self.client.load_awaitable(empty_model_path, "ex", timeout=DEFAULT_TIMEOUT))
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_timeout(self):
        with self.assertRaises(asyncio.TimeoutError):
            await self.client.load_awaitable(long_init_model_path, "ex", timeout=0.1)

    async def test_load_default_timeout(self):
        # Change default timeout to something small
        self.client.default_timeout = 0.1
        with self.assertRaises(asyncio.TimeoutError):
            await self.client.load_awaitable(long_init_model_path, "ex")

    async def test_fake(self):
        assert True


if __name__ == '__main__':
    unittest.main()


