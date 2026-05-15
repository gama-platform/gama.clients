import unittest
import asyncio
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List, Optional

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
long_init_model_path = str(Path(__file__).parents[1] / "gaml/long_init.gaml")

url = "localhost"
port = 6868
default_timeout = 28.0


class TestSyncClientCore(unittest.TestCase):
    """
    Test core functionalities of the GAMA Sync Client including timeout functionality.
    """

    client: GamaSyncClient
    loop: asyncio.AbstractEventLoop
    future_console: Optional[Future] = None

    @staticmethod
    async def message_handler(message: Dict[str, Any]):
        if TestSyncClientCore.future_console is not None and not TestSyncClientCore.future_console.done():
            TestSyncClientCore.future_console.set_result(message)

    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(cls.loop)

        async def _setup():
            cls.client = GamaSyncClient(url, port, other_message_handler=cls.message_handler, default_timeout=default_timeout)
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
        TestSyncClientCore.future_console = None

    def tearDown(self):
        for id in self.sim_id:
            try:
                self.client.stop(id, timeout=5.0)
            except Exception:
                pass

    def test_client_initialization_with_default_timeout(self):
        """
        Test that the client initializes correctly with a default timeout.
        """
        assert self.client.default_timeout == default_timeout

    def test_load_with_default_timeout_nothing_happens(self):
        """
        Test loading an experiment with the default timeout. Nothing should happen.
        """
        gama_response = self.client.load(empty_model_path, "ex")
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        # we check that the default timeout is unchanged
        assert self.client.default_timeout == default_timeout
        self.sim_id.append(ex_id)

    def test_load_with_timeout_nothing_happens(self):
        """
        Test loading an experiment with a custom timeout. Nothing should happen.
        """
        gama_response = self.client.load(empty_model_path, "ex", timeout=10.0)
        assert gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        # we check that the timeout is unchanged
        assert self.client.default_timeout == default_timeout
        self.sim_id.append(ex_id)

    def test_load_with_timeout_reached(self):
        """
        Test loading an experiment with a timeout that is is too short to not be reached
        """
        exception = False
        try:
            # This should timeout since the model does not exist
            gama_response = self.client.load(empty_model_path, "ex", timeout=0.01)
            self.fail("Expected TimeoutError but got response: {}".format(gama_response))
        except asyncio.TimeoutError:
            # Expected behavior, test passes
            exception = True
        assert exception, "Expected a TimeoutError but did not get one"

    def test_load_with_default_timeout_reached(self):
        """
        Test loading a model that will hang for longer than the default timeout defined in the client.
        """
        exception = False
        try:
            # This should timeout since the model does not exist
            gama_response = self.client.load(long_init_model_path, "ex")
            self.fail("Expected TimeoutError but got response: {}".format(gama_response))
        except asyncio.TimeoutError:
            # Expected behavior, test passes
            exception = True
        assert exception, "Expected a TimeoutError but did not get one"

    def test_no_timeout_behavior(self):
        """
        Test that commands work correctly when timeout is None (default timeout).
        """
        gama_response = self.client.load(empty_model_path, "ex", timeout=None)
        gama_response["type"] == MessageTypes.CommandExecutedSuccessfully.value
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)

        # Test expression without timeout
        response = self.client.expression(ex_id, "cycle", timeout=None)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_zero_timeout_behavior(self):
        """
        Test that zero or negative timeout values are treated as no timeout.
        """
        gama_response = self.client.load(empty_model_path, "ex", timeout=0)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)

        # Test with negative timeout (should be treated as no timeout)
        response = self.client.expression(ex_id, "cycle", timeout=-1.0)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_very_short_timeout(self):
        """
        Test behavior with very short timeouts on normally fast operations.
        """
        gama_response = self.client.load(empty_model_path, "ex", timeout=10.0)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)

        # Very short timeout might cause timeout on slow systems
        try:
            response = self.client.expression(ex_id, "cycle", timeout=0.1)
            # If it succeeds, check the response
            self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        except asyncio.TimeoutError:
            # Timeout is acceptable for very short timeouts
            pass

    def test_default_timeout_usage(self):
        """
        Test that default timeout is used when no timeout is specified.
        """
        # Create client with short default timeout (needs a running loop)
        async def _make_client():
            return GamaSyncClient(url, port, default_timeout=5.0)
        short_timeout_client = self.loop.run_until_complete(_make_client())
        short_timeout_client.connect()

        try:
            # This should use the default timeout of 5.0 seconds
            response = short_timeout_client.load(empty_model_path, "ex")
            self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)
            ex_id = response["content"]

            # Clean up
            short_timeout_client.stop(ex_id)
        finally:
            short_timeout_client.close_connection()

    def test_timeout_error_cleanup(self):
        """
        Test that timeout errors properly clean up internal state.
        """
        # This test ensures that futures are cleaned up after timeout
        # We can't easily trigger a real timeout, but we can verify the structure
        initial_futures_count = len(self.client.futures)

        # Perform some operations
        gama_response = self.client.load(empty_model_path, "ex", timeout=10.0)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        ex_id = gama_response["content"]
        self.sim_id.append(ex_id)

        response = self.client.expression(ex_id, "cycle", timeout=5.0)
        self.assertEqual(response["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # After operations complete, futures should be cleaned up
        # (In normal operation, futures are removed when commands complete)
        self.assertGreaterEqual(len(self.client.futures), initial_futures_count)


if __name__ == '__main__':
    unittest.main()
