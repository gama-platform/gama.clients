import argparse
import asyncio
import unittest
from pathlib import Path

from gama_client.message_types import MessageTypes

from gama_client.sync_client import GamaSyncClient


class TestLoad(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port)
        self.client.connect()

    async def test_load(self):
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_fake(self):
        assert True


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
parser = argparse.ArgumentParser()
parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
parser.add_argument("-p", "--port", help="Gama server port", default=6868)
args = parser.parse_args()
url = args.url
port = args.port

if __name__ == '__main__':
    unittest.main()


