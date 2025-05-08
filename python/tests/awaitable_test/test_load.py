import unittest
from pathlib import Path

from gama_client.message_types import MessageTypes

from gama_client.sync_client import GamaSyncClient


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
url = "localhost"
port = 6868


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port)
        self.client.connect()

    async def test_load(self):
        gama_response = await self.client.load_awaitable(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_fake(self):
        assert True


if __name__ == '__main__':
    unittest.main()


