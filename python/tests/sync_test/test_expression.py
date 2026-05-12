import unittest
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_WITH_PARAMS as model_with_params_path

url = "localhost"
port = 6868

class TestExpression(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    sim_id: List[str]

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=10)
        self.client.connect()
        self.sim_id = []

    async def test_expression(self):
        gama_response = self.client.load(model_with_params_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        expr_res = self.client.expression(exp_id, "2 + 2")
        self.assertEqual(expr_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(expr_res["content"], 4)

    async def test_expression_error(self):
        gama_response = self.client.load(model_with_params_path, "ex")
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
        exp_id = gama_response["content"]
        self.sim_id.append(exp_id)

        # Invalid GAML expression
        expr_res = self.client.expression(exp_id, "2 + 'a'")
        self.assertEqual(expr_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_expression_not_loaded(self):
        expr_res = self.client.expression("fake_id", "2 + 2")
        self.assertEqual(expr_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def asyncTearDown(self):
        for id in self.sim_id:
            try:
                self.client.stop(id)
            except Exception:
                pass
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
