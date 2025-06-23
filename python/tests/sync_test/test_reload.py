import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
model_console_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
model_to_import_path = str(Path(__file__).parents[1] / "gaml/to_import.gaml")
model_importing_path = str(Path(__file__).parents[1] / "gaml/importing.gaml")
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

    async def test_reload(self):
        """
        Just reloading an experiment with the minimum number of settings and checking that GS returns the
        expected message.
        :return:
        """
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        gama_response = self.client.reload(ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_reload_random_seed_changing(self):
        """
        We check that the default rng seed changes at each reload, which it should in models where it is
        not explicitly set to a value.
        :return:
        """
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        gama_response = self.client.expression(ex_id, "seed")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        prev_seed = gama_response["content"]
        gama_response = self.client.reload(ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        gama_response = self.client.expression(ex_id, "seed")
        new_seed = gama_response["content"]
        print(prev_seed, new_seed)
        assert prev_seed != new_seed

    async def test_reload_set_one_parameter(self):
        """
        The experiment has first been loaded without setting any parameters, we check that
        after reloading with a value for a parameter it is correctly assigned instead of the default value.
        """
        gama_response = self.client.load(model_with_param_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        gama_response = self.client.reload(ex_id, parameters=[{"type": "int", "name": "i", "value": 123}])
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 123

    async def test_reload_after_setting_parameters(self):
        """
        One parameter has already been set by the load function the first time.

        In the reload we don't give any value to this parameter, it should be set to its default value
        and not the value of the first load
        """
        assert False

    async def test_reload_updating_one_parameter(self):
        """
        One parameter has already been set by the load function the first time.

        In the reload we give a different value to this parameter, it should be set to it and not the default value
        nor the value of the first load
        """
        assert False

    async def test_reload_unset_runtime_error(self):
        assert False

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()
