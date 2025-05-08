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
empty_model_console_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
empty_model_to_import_path = str(Path(__file__).parents[1] / "gaml/to_import.gaml")
empty_model_importing_path = str(Path(__file__).parents[1] / "gaml/importing.gaml")
faulty_model_path = str(Path(__file__).parents[1] / "gaml/faulty.gaml")
model_with_param_path = str(Path(__file__).parents[1] / "gaml/experiment_with_params.gaml")

# TODO: load from a file
url = "localhost"
port = 1002

# TODO: handle timeout to avoid infinite loops


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaAsyncClient
    future_command1: Future
    future_command2: Future
    future_console: Future

    async def message_handler(self, message: Dict[str, Any]):
        if message["type"] == MessageTypes.SimulationOutput:
            self.future_console.set_result(message)
        elif not self.future_command1.done() and not self.future_command1.cancelled():
            self.future_command1.set_result(message)
        else:
            self.future_command2.set_result(message)

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
        # first load the model
        await self.client.load_async(empty_model_console_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        # then ask for a step to be executed
        simulation_id = gama_response["content"]
        await self.client.step_async(simulation_id)


        # finally wait for the console message
        gama_response = await self.future_console
        assert gama_response["type"] == MessageTypes.SimulationOutput.value
        assert gama_response["content"] == "hello"


    async def test_load_virtual(self):
        # TODO: is that normal ???? Should we open an issue ?
        await self.client.load_async(empty_model_to_import_path, "parent_ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_imported_model(self):
        await self.client.load_async(empty_model_to_import_path, "parent_ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_inherited_exp(self):
        await self.client.load_async(empty_model_importing_path, "with_parent")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_inherited_virtual_exp(self):
        await self.client.load_async(empty_model_importing_path, "with_virt_parent")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_parameters(self):

        params = [
            {
                "type": "int",
                "value": 100,
                "name": "i"
            },
            {
                "type": "float",
                "value": 10.34,
                "name": "f"
            },
            {
                "type": "string",
                "value": "salut",
                "name": "s"
            },
            {
                "type": "rgb",
                "value": {
                    "r": 255,
                    "g": 0,
                    "b": 0
                },
                "name": "color"
            }
        ]

        await self.client.load_async(model_with_param_path, "ex", parameters=params)
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        experiment_id = gama_response["content"]

        # check i
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "i")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 100


        # check f
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "i")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 10.34


        # check s
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "i")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == "salut"


        # check color
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "color")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"]["r"] == 255
        assert gama_response["content"]["g"] == 0
        assert gama_response["content"]["b"] == 0





    async def test_load_fake_name_parameters(self):
        pass

    async def test_load_fake_type_parameters(self):
        pass

    async def test_load_empty_parameters(self):
        pass

    async def test_load_global_parameters(self):
        pass

    async def test_load_faulty_model(self):
        await self.client.load_async(faulty_model_path, "with_virt_parent")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response.keys()
        assert "exception" in gama_response["content"]
        assert gama_response["content"]["exception"] == 'GamaCompilationFailedException'


if __name__ == '__main__':
    unittest.main()

