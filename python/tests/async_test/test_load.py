import asyncio
import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.async_client import GamaAsyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
model_console_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
model_to_import_path = str(Path(__file__).parents[1] / "gaml/to_import.gaml")
model_importing_path = str(Path(__file__).parents[1] / "gaml/importing.gaml")
faulty_model_path = str(Path(__file__).parents[1] / "gaml/faulty.gaml")
model_with_param_path = str(Path(__file__).parents[1] / "gaml/experiment_with_params.gaml")
model_init_error_path = str(Path(__file__).parents[1] / "gaml/init_error.gaml")
model_long_init_path = str(Path(__file__).parents[1] / "gaml/long_init.gaml")

# TODO: load from a file
url = "localhost"
port = 6868

# TODO: handle timeout to avoid infinite loops


class TestLoadAwaitable(unittest.IsolatedAsyncioTestCase):

    client: GamaAsyncClient
    future_command1: Future
    future_command2: Future
    future_console: Future
    sim_id: List[str]

    async def message_handler(self, message: Dict[str, Any]):
        if message["type"] == MessageTypes.SimulationOutput.value:
            self.future_console.set_result(message)
        elif message["type"] == MessageTypes.SimulationError.value:
            self.future_error.set_result(message)
        elif not self.future_command1.done() and not self.future_command1.cancelled():
            self.future_command1.set_result(message)
        else:
            self.future_command2.set_result(message)

    # Called before every test
    async def asyncSetUp(self):
        self.client = GamaAsyncClient(url, port, self.message_handler)
        await self.client.connect_async()
        self.future_command1 = Future()
        self.future_command2 = Future()
        self.future_console = Future()
        self.future_error = Future()
        self.sim_id = []

    async def test_load(self):
        await self.client.load_async(empty_model_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

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
        await self.client.load_async(model_batch_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_test(self):
        await self.client.load_async(model_test_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_console(self):
        # first load the model
        await self.client.load_async(model_console_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

        # wait for the console message send in the init
        console_message = await self.future_console
        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("hello")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

        # now we check for the messages send in the reflexes, so we need to execute at least one step
        self.future_console = Future()  # resetting the future for console messages
        await self.client.step_async(gama_response["content"])
        console_message = await self.future_console
        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("Hey")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 0, 'green': 128, 'blue': 0, 'alpha': 255}

    async def test_load_virtual(self):
        # TODO: is that normal ???? Should we open an issue ?
        await self.client.load_async(model_to_import_path, "parent_ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_imported_model(self):
        await self.client.load_async(model_to_import_path, "parent_ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_inherited_exp(self):
        await self.client.load_async(model_importing_path, "with_parent")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    async def test_load_inherited_virtual_exp(self):
        await self.client.load_async(model_importing_path, "with_virt_parent")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

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
                    "red": 255,
                    "green": 0,
                    "blue": 0,
                    "alpha": 255
                },
                "name": "color"
            }
        ]

        await self.client.load_async(model_with_param_path, "ex", parameters=params)
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        experiment_id = gama_response["content"]
        self.sim_id.append(experiment_id)

        # check i
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "i")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 100

        # check f
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "f")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 10.34

        # check s
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "s")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == "salut"

        # check color
        self.future_command1 = Future()
        await self.client.expression_async(experiment_id, "color")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

    async def test_load_long_init(self):
        """
        This runs a model that waits for 1 minute in its init block.
        Both sides of the communication should be properly multithreaded to ensure that the
        connection is kept alive.
        """
        await self.client.load_async(model_long_init_path, "ex")
        gama_response = await self.future_command1
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

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

    async def test_load_runtime_error(self):
        await self.client.load_async(model_init_error_path, "exp", runtime=True)
        gama_response = await self.future_command1
        print(gama_response)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        assert False # For now GS is not sending an error message even though there should be an exception in the init block
        error_message = await self.future_error
        print(error_message)
        assert error_message["type"] == MessageTypes.SimulationError.value
        assert error_message["content"]["exception"].endswith('GamaRuntimeException')
        assert error_message["content"]["message"] == "Division by zero"

    # Clean up after each test
    async def asyncTearDown(self):
        # No need to wait for those commands' result
        for id in self.sim_id:
            await self.client.stop_async(id)
        await self.client.close_connection_async()


if __name__ == '__main__':
    unittest.main()

