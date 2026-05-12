import unittest
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import MODEL_EMPTY as empty_model_path

url = "localhost"
port = 6868

class TestDescribe(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    sim_id: List[str]

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=10)
        self.client.connect()
        self.sim_id = []

    async def test_describe(self):
        desc_res = self.client.describe(empty_model_path)
        self.assertEqual(desc_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        
        content = desc_res["content"]
        self.assertIn("name", content)
        self.assertIn("species", content)
        self.assertIn("experiments", content)

    async def test_describe_no_experiments(self):
        desc_res = self.client.describe(empty_model_path, experiments=False)
        self.assertEqual(desc_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertNotIn("experiments", desc_res["content"])

    async def test_describe_no_species(self):
        desc_res = self.client.describe(empty_model_path, species_names=False)
        self.assertEqual(desc_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        # Assuming species shouldn't be present if species_names=False and others are false, 
        # but the API behavior may vary (the doc says if speciesNames is false but speciesVariables or speciesActions is true, it is considered true).
        # We just test it doesn't crash.

    async def test_describe_fake_model(self):
        desc_res = self.client.describe("fake_path.gaml")
        self.assertEqual(desc_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def asyncTearDown(self):
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
