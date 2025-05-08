import asyncio
import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
empty_model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
empty_model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
console_message_model_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
runtime_error_model_path = str(Path(__file__).parents[1] / "gaml/runtime_error.gaml")
url = "localhost"
port = 6868


class TestLoad(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    future_console: Future

    async def message_handler(self, message: Dict[str, Any]):
        self.future_console.set_result(message)

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, other_message_handler=self.message_handler)
        self.client.connect()
        self.future_console = Future()
        self.sim_id = []

    async def test_load(self):
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_fake_model(self):
        gama_response = self.client.load("does/not/exist", "ex")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].endswith("exist' does not exist")

    async def test_load_fake_exp(self):
        gama_response = self.client.load(empty_model_path, "expe_does_not_exist")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].startswith("'expe_does_not_exist' is not an experiment present in '")

    async def test_load_none_model(self):
        gama_response = self.client.load(None, "expe_does_not_exist")
        assert gama_response["type"] == MessageTypes.MalformedRequest.value
        assert "content" in gama_response
        assert gama_response["content"] == "For load, mandatory parameters are: 'model' and 'experiment'"

    async def test_load_none_exp(self):
        gama_response = self.client.load(empty_model_path, None)
        assert gama_response["type"] == MessageTypes.MalformedRequest.value
        assert "content" in gama_response
        assert gama_response["content"] == "For load, mandatory parameters are: 'model' and 'experiment'"

    async def test_load_empty_model(self):
        gama_response = self.client.load("", "ex")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].endswith("' does not exist")
    
    async def test_load_empty_exp(self):
        gama_response = self.client.load(empty_model_path, "")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].startswith("'' is not an experiment present in '")

    async def test_load_batch(self):
        gama_response = self.client.load(empty_model_batch_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_test(self):
        gama_response = self.client.load(empty_model_test_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_console(self): 
        gama_response = self.client.load(console_message_model_path, "ex", True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        gama_response = self.client.step(gama_response["content"])
        console_message = await self.future_console

        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("hello")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

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

    async def test_load_multiple(self):
        pass

    async def test_load_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        gama_response = self.client.step(gama_response["content"])
        print("after step: ", gama_response)
        # error_message = await self.future_console
        # print(error_message)
        assert False

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()


