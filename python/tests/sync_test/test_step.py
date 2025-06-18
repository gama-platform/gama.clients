import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

runtime_error_model_path = str(Path(__file__).parents[1] / "gaml/runtime_error.gaml")

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

    async def test_step_sync_normal(self):
        assert False

    async def test_step_not_sync_normal(self):
        assert False

    async def test_step_sync_simulation_not_loaded(self):
        assert False

    async def test_step_not_sync_simulation_not_loaded(self):
        assert False

    async def test_multiple_steps_sync(self):
        assert False

    async def test_multiple_steps_not_sync(self):
        assert False

    async def test_step_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        gama_response = self.client.step(gama_response["content"], sync=True)
        assert gama_response["type"] == MessageTypes.RuntimeError.value
        assert gama_response["content"]["message"] == "Division by zero"

    async def test_step_not_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

        self.client.step(gama_response["content"], sync=False)
        gama_response = await self.future_console
        assert gama_response["type"] == MessageTypes.RuntimeError.value
        assert gama_response["content"]["message"] == "Division by zero"

    async def test_step_sync_simulation_over(self):
        assert False

    async def test_step_not_sync_simulation_over(self):
        assert False

    #############
    # STEP BACK #
    #############

    async def test_step_back_sync_normal(self):
        assert False

    async def test_step_back_not_sync_normal(self):
        assert False

    async def test_step_back_sync_simulation_not_loaded(self):
        assert False

    async def test_step_back_not_sync_simulation_not_loaded(self):
        assert False

    async def test_multiple_steps_back_sync(self):
        assert False

    async def test_multiple_steps_back_not_sync(self):
        assert False

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()

