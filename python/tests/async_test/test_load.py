import asyncio
import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any

from gama_client.async_client import GamaAsyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
empty_model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
empty_model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
url = "localhost"
port = 6868


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaAsyncClient
    future_command1: Future
    future_command2: Future
    future_console: Future

    async def message_handler(self, message: Dict[str, Any]):
        self.future_command1.set_result(message)

    async def asyncSetUp(self):
        self.client = GamaAsyncClient(url, port, self.message_handler)
        await self.client.connect_async()
        self.future_command1 = Future()
        self.future_command2 = Future()
        self.future_console = Future()

    async def test_load(self):
        await self.client.load_async(empty_model_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_fake_model(self):
        await self.client.load_async("does/not/exist", "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].endswith("exist' does not exist")

    async def test_load_fake_exp(self):
        await self.client.load_async(empty_model_path, "expe_does_not_exist")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].startswith("'expe_does_not_exist' is not an experiment present in '")

    async def test_load_none_model(self):
        await self.client.load_async(None, "expe_does_not_exist")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.MalformedRequest.value
        assert "content" in gama_response
        assert gama_response["content"] == "For load, mandatory parameters are: 'model' and 'experiment'"

    async def test_load_none_exp(self):
        await self.client.load_async(empty_model_path, None)
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.MalformedRequest.value
        assert "content" in gama_response
        assert gama_response["content"] == "For load, mandatory parameters are: 'model' and 'experiment'"

    async def test_load_empty_model(self):
        await self.client.load_async("", "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].endswith("' does not exist")

    async def test_load_empty_exp(self):
        await self.client.load_async(empty_model_path, "")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].startswith("'' is not an experiment present in '")

    async def test_load_batch(self):
        await self.client.load_async(empty_model_batch_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_test(self):
        await self.client.load_async(empty_model_test_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_console(self):
        pass

    async def test_load_virtual(self):
        pass

    async def test_load_imported_model(self):
        pass

    async def test_load_inherited_exp(self):
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


if __name__ == '__main__':
    unittest.main()

