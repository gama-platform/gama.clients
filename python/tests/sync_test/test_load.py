import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
empty_model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
empty_model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
empty_model_console_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
empty_model_to_import_path = str(Path(__file__).parents[1] / "gaml/to_import.gaml")
empty_model_importing_path = str(Path(__file__).parents[1] / "gaml/importing.gaml")
faulty_model_path = str(Path(__file__).parents[1] / "gaml/faulty.gaml")
model_with_param_path = str(Path(__file__).parents[1] / "gaml/experiment_with_params.gaml")
init_error_model_path = str(Path(__file__).parents[1] / "gaml/init_error.gaml")
url = "localhost"
port = 6868


class TestLoad(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    future_console: Future
    sim_id: List[str]

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
        gama_response = self.client.load(empty_model_console_path, "ex", True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        gama_response = self.client.step(gama_response["content"])
        console_message = await self.future_console

        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("hello")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

    async def test_load_virtual(self):
        pass

    async def test_load_imported_model(self):
        gama_response = self.client.load(empty_model_to_import_path, "parent_ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_inherited_exp(self):
        gama_response = self.client.load(empty_model_importing_path, "with_parent")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_load_inherited_virtual_exp(self):
        gama_response = self.client.load(empty_model_importing_path, "with_virt_parent")
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

        gama_response = self.client.load(model_with_param_path, "ex", parameters=params)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        experiment_id = gama_response["content"]

        # check i
        gama_response = self.client.expression(experiment_id, "i")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 100


        # check f
        gama_response = self.client.expression(experiment_id, "f")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == 10.34


        # check s
        gama_response = self.client.expression(experiment_id, "s")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == "salut"


        # check color
        gama_response = self.client.expression(experiment_id, "color")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

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

    async def test_load_faulty_model(self):
        gama_response = self.client.load(faulty_model_path, "with_virt_parent")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response.keys()
        assert "exception" in gama_response["content"]
        assert gama_response["content"]["exception"] == 'GamaCompilationFailedException'

    async def test_load_runtime_error(self):
        gama_response = self.client.load(init_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        assert False # TODO: not working currently because GS is not throwing the error in the init
        gama_response = await self.future_console
        assert gama_response["type"] == MessageTypes.RuntimeError.value
        assert gama_response["content"]["message"] == "Division by zero"

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()


