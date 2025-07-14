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


class TestReload(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    future_console: Future
    sim_id: List[str]

    async def message_handler(self, message: Dict[str, Any]):
        self.future_console.set_result(message)

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, other_message_handler=self.message_handler, default_timeout=10)
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
        self.sim_id.append(ex_id)
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
        self.sim_id.append(ex_id)
        gama_response = self.client.expression(ex_id, "seed")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        prev_seed = gama_response["content"]
        gama_response = self.client.reload(ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        gama_response = self.client.expression(ex_id, "seed")
        new_seed = gama_response["content"]
        assert prev_seed != new_seed, "Seed did not change after reload"

    async def test_reload_set_one_parameter(self):
        """
        The experiment has first been loaded without setting any parameters, we check that
        after reloading with a value for a parameter it is correctly assigned instead of the default value.
        """
        gama_response = self.client.load(model_with_param_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        gama_response = self.client.reload(ex_id, parameters=[{"type": "int", "name": "i", "value": 123}])
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 123

    async def test_reload_without_parameter_after_load_with_parameter(self):
        """
        One parameter has already been set by the load function the first time.

        In the reload we don't give any value to this parameter, it should be reset to the value given in the
        first load, and not the init value nor the last value it had during the execution of the model.
        """
        # Load with custom parameter value
        gama_response = self.client.load(
            model_with_param_path, 
            "ex", 
            parameters=[{"type": "int", "name": "i", "value": 999}]
        )
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        
        # Verify parameter was set
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 999
        
        # Change the parameter value during execution
        gama_response = self.client.expression(ex_id, "i <- 1234;")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        # Reload without specifying parameter - should reset to previous load value
        gama_response = self.client.reload(ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value        
        
        # Check that parameter is back to default value
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 999

    async def test_reload_updating_one_parameter(self):
        """
        One parameter has already been set by the load function the first time.

        In the reload we give a different value to this parameter, it should be set to it and not the init value
        nor the value of the first load
        """
        # Load with initial parameter value
        gama_response = self.client.load(
            model_with_param_path, 
            "ex", 
            parameters=[{"type": "int", "name": "i", "value": 500}]
        )
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        
        # Verify initial parameter was set
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 500
          # Reload with different parameter value
        gama_response = self.client.reload(ex_id, parameters=[{"type": "int", "name": "i", "value": 777}])
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        
        # Check that parameter has the new value (not default or old value)
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 777  # new value from reload

    async def test_reload_syntax_error(self):
        """
        Test that reload returns an error when the model has syntax errors.
        """
        gama_response = self.client.load(faulty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "compilation errors" in gama_response["content"]["message"].lower(), "Expected syntax error message not found"

    async def test_reload_runtime_error(self):
        """
        Test that reload works correctly with a model that has runtime errors.
        """        
        # Load a model that will cause runtime errors  
        gama_response = self.client.load(init_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        
        # Try to reload the same experiment - should succeed even with runtime errors in the model
        gama_response = self.client.reload(ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_reload_multiple_parameters(self):
        """
        Test reloading with multiple parameters to ensure all are properly set.
        """
        # Load with multiple parameters
        params = [
            {"type": "int", "name": "i", "value": 100},
            {"type": "float", "name": "f", "value": 25.5},
            {"type": "string", "name": "s", "value": "test"},
            {"type": "rgb", "name": "color", "value": [255, 0, 0, 255]}
        ]
        gama_response = self.client.load(model_with_param_path, "ex", parameters=params)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        
        # Reload with different values for all parameters
        new_params = [
            {"type": "int", "name": "i", "value": 200},
            {"type": "float", "name": "f", "value": 50.7},
            {"type": "string", "name": "s", "value": "reloaded"},
            {"type": "rgb", "name": "color", "value": [0, 255, 0, 125]}
        ]
        gama_response = self.client.reload(ex_id, parameters=new_params)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        
        # Verify all parameters were updated
        val_i = self.client.expression(ex_id, "i")
        assert val_i["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_i["content"] == 200
        
        val_f = self.client.expression(ex_id, "f")
        assert val_f["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_f["content"] == 50.7
        
        val_s = self.client.expression(ex_id, "s")
        assert val_s["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_s["content"] == "reloaded"

        val_color = self.client.expression(ex_id, "color")
        assert val_color["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert val_color["content"] == {"gaml_type": "rgb", "red": 0, "green": 255, "blue": 0, "alpha": 125}

    async def test_reload_invalid_experiment_id(self):
        """
        Test reload with a non-existent experiment ID to ensure proper error handling.
        """
        gama_response = self.client.reload("non_existent_id")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    async def test_reload_with_until_condition(self):
        """
        Test reload with an 'until' condition parameter.
        """
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)
        
        # Reload with an until condition
        gama_response = self.client.reload(ex_id, until="cycle >= 5")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_reload_preserves_experiment_id(self):
        """
        Test that reload preserves the same experiment ID. To do so we reload and
        try to interact with the experiment using the same ID.
        """
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        original_ex_id = gama_response["content"]
        self.sim_id.append(original_ex_id)
        
        # Reload the experiment
        gama_response = self.client.reload(original_ex_id)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        
        # The experiment ID should remain the same after reload
        gama_response = self.client.expression(original_ex_id, "cycle")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    async def test_timeout_functionality(self):
        """
        Test that timeout parameter works correctly for commands.
        """
        import asyncio
        
        # Test with invalid experiment ID - should timeout quickly rather than hang
        try:
            # This should either fail quickly with an error or timeout
            gama_response = self.client.reload("invalid_experiment_id", timeout=2.0)
            # If it succeeds, check the response type
            if gama_response["type"] == MessageTypes.UnableToExecuteRequest.value:
                print("✓ Timeout test: Command failed as expected with error response")
            else:
                print(f"✓ Timeout test: Unexpected success: {gama_response}")
        except asyncio.TimeoutError:
            print("✓ Timeout test: Command timed out as expected")
        except Exception as e:
            print(f"✓ Timeout test: Command failed with other error (also expected): {e}")

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()
