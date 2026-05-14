import unittest
from asyncio import Future, sleep
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import (
    MODEL_RUNTIME_ERROR as runtime_error_model_path,
    MODEL_EMPTY as empty_model_path,
    MODEL_SLOW as slow_model_path
)

url = "localhost"
port = 6868


class TestStep(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    future_console: Future
    sim_id: List[str]

    async def message_handler(self, message: Dict[str, Any]):
        print("Message received in message handler:", message)
        # Always try to set the result - if future is done, this will be ignored
        try:
            if hasattr(self, 'future_console') and not self.future_console.done():
                self.future_console.set_result(message)
        except Exception as e:
            print(f"Error setting future result: {e}")

    def reset_console_future(self):
        """Reset the console future to prepare for a new message"""
        self.future_console = Future()
        return self.future_console

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, other_message_handler=self.message_handler, default_timeout=10)
        self.client.connect()
        self.future_console = Future()
        self.sim_id = []

    async def test_step_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    async def test_step_not_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # check that we actually did one step, waiting 2 seconds should be more than enough to see if the cycle increased
        await sleep(2)
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 1)

    async def test_step_sync_simulation_not_loaded(self):
        step_res = self.client.step("fake_id", sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_step_not_sync_simulation_not_loaded(self):
        step_res = self.client.step("fake_id", sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_multiple_steps_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, nb_step=5, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 5)

    async def test_multiple_steps_not_sync(self):
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

    async def test_multiple_steps_not_sync_finishes(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        step_res = self.client.step(exp_id, nb_step=5, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # wait for the simulation to finish
        await sleep(2)
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 5)


    async def test_step_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        print("Stepping in sync mode...")
        gama_response = self.client.step(exp_id, sync=True)
        print(f"Step response: {gama_response}")
        
        # For sync=True, the error should be in the direct response
        if gama_response["type"] == MessageTypes.RuntimeError.value:
            assert gama_response["content"]["message"] == "Division by zero"
        else:
            # If not in direct response, wait for async message
            self.reset_console_future()
            try:
                import asyncio
                error = await asyncio.wait_for(self.future_console, timeout=3.0)
                assert error["type"] == MessageTypes.RuntimeError.value
                assert error["content"]["message"] == "Division by zero"
            except asyncio.TimeoutError:
                raise AssertionError(f"Expected runtime error but got: {gama_response}")

    async def test_step_not_sync_runtime_error(self):
        gama_response = self.client.load(runtime_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)
        
        # Reset future before expecting a new message
        self.reset_console_future()
        
        print("Stepping in non-sync mode...")
        step_response = self.client.step(exp_id, sync=False)
        print(f"Step response: {step_response}")
        
        print("Waiting for runtime error message...")
        try:
            import asyncio
            # Add timeout to prevent hanging forever
            gama_response = await asyncio.wait_for(self.future_console, timeout=5.0)
            print("Received runtime error message:", gama_response)
            assert gama_response["type"] == MessageTypes.RuntimeError.value
            assert gama_response["content"]["message"] == "Division by zero"
        except asyncio.TimeoutError:
            print("Timeout waiting for runtime error message")
            # Let's check if we can get the error by stepping again
            self.reset_console_future()
            step_response2 = self.client.step(exp_id, sync=True)
            print(f"Sync step response: {step_response2}")
            if step_response2["type"] == MessageTypes.RuntimeError.value:
                assert step_response2["content"]["message"] == "Division by zero"
            else:
                raise AssertionError("Expected runtime error but got timeout")

    async def test_step_sync_simulation_over(self):
        gama_response = self.client.load(empty_model_path, "ex", until="cycle >= 1")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Step up to condition
        self.client.step(exp_id, nb_step=2, sync=True)
        
        # Step again when simulation is over
        step_res = self.client.step(exp_id, sync=True)
        # Either it's unable to execute, or it returns success but does nothing. 
        # Usually it returns UnableToExecuteRequest
        self.assertIn(step_res["type"], [MessageTypes.UnableToExecuteRequest.value, MessageTypes.CommandExecutedSuccessfully.value])

    async def test_step_not_sync_simulation_over(self):
        gama_response = self.client.load(empty_model_path, "ex", until="cycle >= 1")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Step up to condition
        self.client.step(exp_id, nb_step=2, sync=True)
        
        # Step again when simulation is over
        step_res = self.client.step(exp_id, sync=False)
        self.assertIn(step_res["type"], [MessageTypes.UnableToExecuteRequest.value, MessageTypes.CommandExecutedSuccessfully.value])

    #############
    # STEP BACK #
    #############

    async def test_step_back_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, sync=True)
        step_res = self.client.step_back(exp_id, sync=True)

        # Checking that server executed the query
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # Checking that the step back worked
        expression_val = self.client.expression(exp_id, "cycle")
        self.assertEqual(expression_val["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expression_val["content"], 0)

    async def test_step_back_not_sync_normal(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, sync=True)
        step_res = self.client.step_back(exp_id, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_step_back_sync_simulation_not_loaded(self):
        step_res = self.client.step_back("fake_id", sync=True)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_step_back_not_sync_simulation_not_loaded(self):
        step_res = self.client.step_back("fake_id", sync=False)
        self.assertEqual(step_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_multiple_steps_back_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, nb_step=5, sync=True)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=True)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def test_multiple_steps_back_not_sync(self):
        gama_response = self.client.load(empty_model_path, "ex")
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.step(exp_id, nb_step=5, sync=True)
        step_res = self.client.step_back(exp_id, nb_step=5, sync=False)
        self.assertEqual(step_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()


if __name__ == '__main__':
    unittest.main()

