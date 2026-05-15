import asyncio
import unittest
from typing import List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes
from gaml_paths import (
    MODEL_EMPTY as empty_model_path,
    MODEL_BATCH as empty_model_batch_path,
    MODEL_TEST as empty_model_test_path,
    MODEL_CONSOLE as empty_model_console_path,
    MODEL_TO_IMPORT as empty_model_to_import_path,
    MODEL_IMPORTING as empty_model_importing_path,
    MODEL_FAULTY as faulty_model_path,
    MODEL_WITH_PARAMS as model_with_param_path,
    MODEL_RUNTIME_ERROR as runtime_error_model_path,
)

url = "localhost"
port = 6868


class TestValidate(unittest.TestCase):

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
            except Exception as e:
                print(f"Could not stop {id}: {type(e).__name__}: {e}")

    def test_empty_text(self):
        gama_response = self.client.validate("", True, True)
        self.assertEqual(gama_response["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_none_text(self):
        gama_response = self.client.validate(None, True, True)
        self.assertEqual(gama_response["type"], MessageTypes.MalformedRequest.value)

    def test_no_model_name(self):
        gama_response = self.client.validate("model\n", True, True)
        self.assertEqual(gama_response["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_minimal_passing(self):
        gama_response = self.client.validate("model test\n", True, True)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)

    def test_forget_last_closing_bracket(self):
        gama_response = self.client.validate("model test\nglobal {\n", True, True)
        self.assertEqual(gama_response["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_full_example_syntax_error(self):
        text_to_test = "model CrowdSimulation\n\nglobal {\n    int number_of_agents <- 100; // Number of people in the crowd\n    float max_speed <- 2#m/s;     // Maximum speed for each agent\n    geometry world_shape <- square(100); // Define the boundaries of the simulation area as a square with side length 100 meters\n\n    init {\n        create agents number: number_of_agents;\n    }\n}\n\nspecies agent skills:[moving] {\n    float speed <- max_speed / 2 + rand(max_speed / 2); // Randomize initial speed within half to full of max speed\n    point target_location; // Where the agent is moving towards\n\n    reflex move_around when: (target_location = nil or distance(target_location) < 1#m) {\n        target_location <- any_point_in(world_shape); // Set a new random target location within the world boundaries\n    }\n\n    reflex go_to_target {\n        do goto target: target_location speed: speed; // Move towards the target location at the given speed\n    }\n}\n\nexperiment CrowdExperiment type: gui {\n    output display my_display {\n        species_layer agents;\n    }\n}"
        gama_response = self.client.validate(text_to_test, True, True)
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    def test_semantic_error_returned(self):
        gama_response = self.client.validate("model test\nglobal { int a <- 'string'; }\n", False, True)
        self.assertEqual(gama_response["type"], MessageTypes.UnableToExecuteRequest.value)

    def test_semantic_error_not_returned(self):
        gama_response = self.client.validate("model test\nglobal { int a <- 'string'; }\n", True, True)
        self.assertEqual(gama_response["type"], MessageTypes.CommandExecutedSuccessfully.value)
