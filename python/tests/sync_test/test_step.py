import asyncio
import time
import unittest
from asyncio import Future
from typing import Dict, Any, List, Optional

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import (
    MODEL_RUNTIME_ERROR as runtime_error_model_path,
    MODEL_EMPTY as empty_model_path,
    MODEL_EMPTY_NO_RECORD as empty_no_record_model_path,
    MODEL_SLOW as slow_model_path
)

url = "localhost"
port = 6868


class TestStep(unittest.TestCase):

    client: GamaSyncClient
    loop: asyncio.AbstractEventLoop
    future_console: Optional[Future] = None

    @staticmethod
    async def message_handler(message: Dict[str, Any]):
        print("Message received in message handler:", message)
        if TestStep.future_console is not None and not TestStep.future_console.done():
            try:
                TestStep.future_console.set_result(message)
            except Exception as e:
                print(f"Error setting future result: {e}")

    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(cls.loop)

        async def _setup():
            cls.client = GamaSyncClient(url, port, other_message_handler=cls.message_handler, default_timeout=10)
            cls.client.connect()

        cls.loop.run_until_complete(_setup())

    @classmethod
    def tearDownClass(cls):
        try:
            cls.client.close_connection()
        except Exception as e:
            print(f"Error closing connection: {e}")
        cls.loop.close()

    def setUp(self):
        self.sim_id: List[str] = []
        TestStep.future_console = None

    def tearDown(self):
        for id in self.sim_id:
            try:
                self.client.stop(id, timeout=3)
            except Exception as e:
                print(f"Could not stop {id}: {type(e).__name__}: {e}")

    def _reset_console_future(self):
        TestStep.future_console = TestStep.loop.create_future()
        return TestStep.future_console

    def test_step_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    def test_step_not_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # check that we actually did one step, waiting 2 seconds should be more than enough to see if the cycle increased
        time.sleep(2)
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    def test_step_sync_simulation_not_loaded(self):
        step_res = self.client.step("fake_id", sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_step_not_sync_simulation_not_loaded(self):
        step_res = self.client.step("fake_id", sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_multiple_steps_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, nb_step=5, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 5)

    def test_multiple_steps_not_sync(self):
        gama_response = self.client.load(slow_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, nb_step=5000, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # We ask for a big number of steps, we expect the next command to be executed before it finishes.
        # This means the number of cycles should be less than 5000
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertLess(expression_val["content"], 5000)
        self.assertGreaterEqual(expression_val["content"], 0)

    def test_multiple_steps_not_sync_finishes(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, nb_step=5, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # wait for the simulation to finish
        time.sleep(2)
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 5)

    def test_step_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Set up console future before stepping so we can catch the async runtime error message
        self._reset_console_future()

        gama_response = self.client.step(exp_id, sync=True)

        # If we got a direct RuntimeError response, success
        if gama_response["type"] == MessageTypes.RuntimeError.value:
            self.assertEqual(gama_response["content"]["message"], "Division by zero")

        # assert False # restore code under once we manage to reach this
        # We should also have a simulation error in the console
        err = TestStep.loop.run_until_complete(asyncio.wait_for(TestStep.future_console, 10))
        self.assertEqual(err["type"], MessageTypes.SimulationError.value)
        self.assertEqual(err["content"]["message"], "Division by zero")


    def test_step_not_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # we use the console future to catch the runtime error message since we set runtime to true at load
        self._reset_console_future()

        # step_response should not contain a runtime error as it is run in async, so it is successful if the query is syntactically correct
        step_response = self.client.step(exp_id, sync=False)
        self.assertEqual(step_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        gama_response = TestStep.loop.run_until_complete(asyncio.wait_for(TestStep.future_console, timeout=5.0))
        self.assertEqual(gama_response["type"], MessageTypes.SimulationError.value)
        self.assertEqual(gama_response["content"]["message"], "Division by zero")

    def test_step_sync_simulation_over(self):
        gama_response = self.client.load(empty_model_path, "ex", until="cycle >= 1")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Step up to condition
        self.client.step(exp_id, nb_step=2, sync=True)

        # Step again when simulation is over
        step_res = self.client.step(exp_id, sync=True)
        # It returns UnableToExecuteRequest
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_step_not_sync_simulation_over(self):
        gama_response = self.client.load(empty_model_path, "ex", until="cycle >= 1")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Step up to condition
        self.client.step(exp_id, nb_step=2, sync=True)

        # Step again when simulation is over
        step_res = self.client.step(exp_id, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    #############
    # STEP BACK #
    #############

    def test_step_back_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, nb_step=5, sync=True)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=True)

        # Checking that server executed the query
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # Checking that the step back worked
        expression_val = self.client.expression(exp_id, "simulation.cycle") # We need to query simulation.cycle because the experiment cycle is unaffected
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 0)

    def test_step_back_not_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res =self.client.step(exp_id, nb_step=5, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        asyncio.run(asyncio.sleep(30))  # wait a bit for the step back to be executed
        expression_val = self.client.expression(exp_id, "simulation.cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 0)


    def test_step_back_sync_simulation_not_loaded(self):
        step_res = self.client.step_back("fake_id", sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_step_back_not_sync_simulation_not_loaded(self):
        step_res = self.client.step_back("fake_id", sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_step_back_sync_not_recording(self):
        """Stepping back on an experiment declared without `record: true` must fail explicitly.

        The state is not memorized, so nothing can be restored: the server has to say so instead of
        acknowledging a step back that leaves the cycle untouched.
        """
        gama_response = self.client.load(empty_no_record_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        step_res = self.client.step_back(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)
        self.assertIn("record", str(step_res["content"]).lower())

        # And the cycle must not have moved
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    def test_step_back_not_sync_not_recording(self):
        """Same as above through the asynchronous path, which uses a different code path in the controller."""
        gama_response = self.client.load(empty_no_record_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        step_res = self.client.step_back(exp_id, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)
        self.assertIn("record", str(step_res["content"]).lower())

    def test_step_back_sync_at_first_cycle(self):
        """Stepping back from cycle 0 has no previous state to restore and must fail explicitly."""
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step_back(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_multiple_steps_back_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, nb_step=5, sync=True)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_multiple_steps_back_not_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, nb_step=5, sync=True)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)


if __name__ == '__main__':
    unittest.main()
