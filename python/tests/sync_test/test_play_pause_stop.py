import asyncio
import unittest
from typing import List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868


class TestPlayPauseStop(unittest.TestCase):

    client: GamaSyncClient
    loop: asyncio.AbstractEventLoop

    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(cls.loop)

        async def _setup():
            cls.client = GamaSyncClient(url, port, default_timeout=10)
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

    def tearDown(self):
        for id in self.sim_id:
            try:
                self.client.stop(id)
            except Exception:
                pass

    def test_play(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        play_res = self.client.play(exp_id)
        self.assertEqual(play_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_pause(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        self.client.play(exp_id)
        pause_res = self.client.pause(exp_id)
        self.assertEqual(pause_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_stop(self):
        gama_response = self.client.load(empty_model_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        stop_res = self.client.stop(exp_id)
        self.assertEqual(stop_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        # Should not be able to play after stop
        play_res = self.client.play(exp_id)
        self.assertEqual(play_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_play_not_loaded(self):
        play_res = self.client.play("fake_id")
        self.assertEqual(play_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_pause_not_loaded(self):
        pause_res = self.client.pause("fake_id")
        self.assertEqual(pause_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_stop_not_loaded(self):
        stop_res = self.client.stop("fake_id")
        self.assertEqual(stop_res["type"], MessageTypes.UnableToExecuteRequest.value)


if __name__ == '__main__':
    unittest.main()
