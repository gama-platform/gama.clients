import asyncio
import unittest
from typing import List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_WITH_PARAMS as model_with_params_path

url = "localhost"
port = 6868


class TestExpression(unittest.TestCase):

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

    def test_expression(self):
        gama_response = self.client.load(model_with_params_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        expr_res = self.client.expression(exp_id, "2 + 2")
        self.assertEqual(expr_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expr_res["content"], 4)

    def test_expression_error(self):
        gama_response = self.client.load(model_with_params_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Invalid GAML expression
        expr_res = self.client.expression(exp_id, "2 + 'a'")
        self.assertEqual(expr_res["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_expression_not_loaded(self):
        expr_res = self.client.expression("fake_id", "2 + 2")
        self.assertEqual(expr_res["type"], MessageTypes.UnableToExecuteRequest.value)


if __name__ == '__main__':
    unittest.main()
