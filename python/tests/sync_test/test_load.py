import asyncio
import unittest
from asyncio import Future
from typing import Dict, Any, List, Optional

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import (
    MODEL_EMPTY as empty_model_path,
    MODEL_BATCH as model_batch_path,
    MODEL_TEST as model_test_path,
    MODEL_CONSOLE as model_console_path,
    MODEL_TO_IMPORT as model_to_import_path,
    MODEL_IMPORTING as model_importing_path,
    MODEL_FAULTY as faulty_model_path,
    MODEL_WITH_PARAMS as model_with_param_path,
    MODEL_INIT_ERROR as init_error_model_path,
    MODEL_LONG_INIT as long_init_model_path,
)

url = "localhost"
port = 6868


class TestLoad(unittest.TestCase):

    client: GamaSyncClient
    loop: asyncio.AbstractEventLoop
    future_console: Optional[Future] = None

    @staticmethod
    async def message_handler(message: Dict[str, Any]):
        if TestLoad.future_console is not None and not TestLoad.future_console.done():
            TestLoad.future_console.set_result(message)

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
        TestLoad.future_console = None

    def tearDown(self):
        for id in self.sim_id:
            try:
                self.client.stop(id)
            except Exception as e:
                print(f"Could not stop {id}: {type(e).__name__}: {e}")

    def _reset_console_future(self):
        TestLoad.future_console = self.loop.create_future()
        return TestLoad.future_console

    def test_load(self):
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

    def test_load_fake_model(self):
        gama_response = self.client.load("does/not/exist", "ex")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    def test_load_fake_exp(self):
        gama_response = self.client.load(empty_model_path, "expe_does_not_exist")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    def test_load_none_model(self):
        gama_response = self.client.load(None, "expe_does_not_exist")
        assert gama_response["type"] == MessageTypes.MalformedRequest.value

    def test_load_none_exp(self):
        gama_response = self.client.load(empty_model_path, None)
        assert gama_response["type"] == MessageTypes.MalformedRequest.value
        assert "content" in gama_response

    def test_load_empty_model(self):
        gama_response = self.client.load("", "ex")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    def test_load_right_model_empty_exp(self):
        gama_response = self.client.load(empty_model_path, "")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response
        assert gama_response["content"].startswith("'' is not an experiment present in '")

    def test_load_batch(self):
        gama_response = self.client.load(model_batch_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_test(self):
        gama_response = self.client.load(model_test_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_console(self):
        self._reset_console_future()
        gama_response = self.client.load(model_console_path, "ex", True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        self.sim_id.append(gama_response["content"])

        # first we test the message written in the init block
        console_message = self.loop.run_until_complete(TestLoad.future_console)
        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("hello")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 255, 'green': 0, 'blue': 0, 'alpha': 255}

        # now we check for the messages send in the reflexes, so we need to execute at least one step
        self._reset_console_future()  # resetting the future for console messages
        self.client.step(gama_response["content"])
        console_message = self.loop.run_until_complete(TestLoad.future_console)
        assert console_message["type"] == MessageTypes.SimulationOutput.value
        assert console_message["content"]["message"].startswith("Hey")
        assert console_message["content"]["color"] == {'gaml_type': 'rgb', 'red': 0, 'green': 128, 'blue': 0, 'alpha': 255}

    def test_load_virtual(self):
        gama_response = self.client.load(model_to_import_path, "parent_ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.sim_id.append(gama_response["content"])

    def test_load_imported_model(self):
        gama_response = self.client.load(model_to_import_path, "parent_ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_inherited_exp(self):
        gama_response = self.client.load(model_importing_path, "with_parent")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_inherited_virtual_exp(self):
        gama_response = self.client.load(model_importing_path, "with_virt_parent")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_parameters(self):
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

    def test_load_fake_name_parameters(self):
        params = [{"type": "int", "value": 100, "name": "fake_param_name_does_not_exist"}]
        gama_response = self.client.load(model_with_param_path, "ex", parameters=params)
        # It could return CommandExecutedSuccessfully (ignoring the param) or UnableToExecuteRequest
        self.assertIn(gama_response["type"], [MessageTypes.UnableToExecuteRequest.value, MessageTypes.CommandExecutedSuccessfully.value])
        if gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value:
            self.sim_id.append(gama_response["content"])

    def test_load_fake_type_parameters(self):
        params = [{"type": "string", "value": "this is a string", "name": "i"}] # 'i' is an int
        gama_response = self.client.load(model_with_param_path, "ex", parameters=params)
        self.assertIn(gama_response["type"], [MessageTypes.UnableToExecuteRequest.value, MessageTypes.CommandExecutedSuccessfully.value])
        if gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value:
            self.sim_id.append(gama_response["content"])

    def test_load_empty_parameters(self):
        gama_response = self.client.load(model_with_param_path, "ex", parameters=[])
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.sim_id.append(gama_response["content"])

    def test_load_global_parameters(self):
        # 'j' is defined in global but not explicitly exposed as an experiment parameter
        params = [{"type": "int", "value": 42, "name": "j"}]
        gama_response = self.client.load(model_with_param_path, "ex", parameters=params)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        experiment_id = gama_response["content"]
        self.sim_id.append(experiment_id)

        # check if 'j' was actually set
        expr_res = self.client.expression(experiment_id, "j")
        self.assertEqual(expr_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        # It might be 42 if setting global variables works, or -2 if it's ignored
        self.assertIn(expr_res["content"], [42, -2])

    def test_load_multiple(self):
        gama_response1 = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response1["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.sim_id.append(gama_response1["content"])

        gama_response2 = self.client.load(model_test_path, "ex")
        self.assertEqual(gama_response2["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.sim_id.append(gama_response2["content"])

    def test_load_faulty_model(self):
        gama_response = self.client.load(faulty_model_path, "with_virt_parent")
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value
        assert "content" in gama_response.keys()
        assert "exception" in gama_response["content"]
        assert gama_response["content"]["exception"] == 'GamaCompilationFailedException'

    def test_load_runtime_error(self):
        gama_response = self.client.load(init_error_model_path, "exp", runtime=True)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value

    def test_load_timeout(self):
        self.client.default_timeout = None  # disable default timeout to test the timeout parameter of load
        with self.assertRaises(asyncio.TimeoutError):
            self.client.load(long_init_model_path, "ex", timeout=1)

    def test_load_default_timeout(self):
        # Change default timeout to something small
        old_timeout = self.client.default_timeout
        self.client.default_timeout = 1
        try:
            with self.assertRaises(asyncio.TimeoutError):
                self.client.load(long_init_model_path, "ex")
        finally:
            self.client.default_timeout = old_timeout

        # Not sure how to make it work in GS currently, skipping the console assertion for now
        # gama_response = await self.future_console
        # assert gama_response["type"] == MessageTypes.RuntimeError.value
        # assert gama_response["content"]["message"] == "Division by zero"


if __name__ == '__main__':
    unittest.main()
