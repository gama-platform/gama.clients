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

    async def test_load_classic(self):
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_fake_model():
        pass

    async def test_load_fake_exp(self):
        pass

    async def test_load_none_model(self):
        pass

    async def test_load_none_exp(self):
        pass

    async def test_load_empty_model(self):
        pass
    
    async def test_load_empty_exp(self):
        pass

    async def test_load_batch(self):
        pass

    async def test_load_test(self):
        pass

    async def test_load_console(self):
        pass

    async def test_load_virtual(self):
        pass

    async def test_load_imported_model(self):
        pass

    async def test_load_inerited_exp(self):
        pass

    async def test_load_parameters(self):
        pass

    async def test_load_fake_name_parameters(self):
        pass

    async def test_load_fake_type_parameters(self):
        pass

    async def test_load_empty_parameters(self):
        pass

    async def test_load_global_parameters(self):
        pass

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


