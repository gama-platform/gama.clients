import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
random_model_path = str(Path(__file__).parents[1] / "gaml/random.gaml")
url = "localhost"
port = 6868


class TestSeed(unittest.IsolatedAsyncioTestCase):

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
    
    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()

    async def test_default_seed(self):
        """
        Test that the default seed is set to a different random value every load
        """
        # Load an empty model
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

        # Get the default seed for the simulation
        gama_response = self.client.expression(self.sim_id[0], "seed")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        old = gama_response["content"]

        # Load a second time to check if the seed changes
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])
        # Get the seed for the second simulation
        gama_response = self.client.expression(self.sim_id[1], "seed")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        new = gama_response["content"]
        assert new != old

    async def test_setting_seed_manually(self):
        """
        Test setting the seed manually after loading a simulation
        """
        # Load an empty model
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

        # Set a seed for the simulation
        seed_value = 42
        gama_response = self.client.expression(self.sim_id[0], f"seed <- {seed_value}")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        # Verify that the seed was set correctly
        gama_response = self.client.expression(self.sim_id[0], "seed")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        assert gama_response["content"] == seed_value

    async def test_seed_consistency(self):
        """
        Test that the result of random draws are different when the seed is not set
        """
        # Load a model
        gama_response = self.client.load(random_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

        # run one step to get a random value for the variable 'val'
        gama_response = self.client.step(self.sim_id[0], sync=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        # Get the value of 'val' after the step
        gama_response = self.client.expression(self.sim_id[0], "val")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        old_val = gama_response["content"]
        
        # Load a second time
        gama_response = self.client.load(random_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])
        # run one step to get a random value for the variable 'val'
        gama_response = self.client.step(self.sim_id[1], sync=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        # Get the value of 'val' after the step
        gama_response = self.client.expression(self.sim_id[1], "val")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        new_val = gama_response["content"]

        # Check that the values are different
        assert new_val != old_val

if __name__ == '__main__':
    unittest.main()