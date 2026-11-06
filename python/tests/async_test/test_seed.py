import asyncio
import unittest

from gama_client.async_client import GamaAsyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY, MODEL_TEST


class TestSeedAsync(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.replies = asyncio.Queue()
        self.client = GamaAsyncClient("localhost", 6868, self.message_handler)
        await asyncio.wait_for(self.client.connect_async(), timeout=10)
        self.addAsyncCleanup(self.client.close_connection_async)

    async def message_handler(self, message):
        # Simulation status messages can arrive before the command reply.
        if "command" in message:
            self.replies.put_nowait(message)

    async def successful_reply(self):
        response = await asyncio.wait_for(self.replies.get(), timeout=10)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        return response["content"]

    async def test_load_set_seed(self):
        await self.client.load_async(MODEL_TEST, "ex", seed=123)
        exp_id = await self.successful_reply()
        self.addAsyncCleanup(self.client.stop_async, exp_id)

        await self.client.expression_async(exp_id, "seed")
        self.assertEqual(await self.successful_reply(), 123)

    async def test_reload_manual_seed_changing(self):
        await self.client.load_async(MODEL_EMPTY, "ex", seed=321)
        exp_id = await self.successful_reply()
        self.addAsyncCleanup(self.client.stop_async, exp_id)

        await self.client.reload_async(exp_id, seed=123)
        await self.successful_reply()
        await self.client.expression_async(exp_id, "seed")
        self.assertEqual(await self.successful_reply(), 123)
