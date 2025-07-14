import unittest
from asyncio import Future
from pathlib import Path
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


empty_model_path = str(Path(__file__).parents[1] / "gaml/empty.gaml")
empty_model_batch_path = str(Path(__file__).parents[1] / "gaml/empty_batch.gaml")
empty_model_test_path = str(Path(__file__).parents[1] / "gaml/empty_test.gaml")
empty_model_console_path = str(Path(__file__).parents[1] / "gaml/console_message.gaml")
empty_model_to_import_path = str(Path(__file__).parents[1] / "gaml/to_import.gaml")
empty_model_importing_path = str(Path(__file__).parents[1] / "gaml/importing.gaml")
faulty_model_path = str(Path(__file__).parents[1] / "gaml/faulty.gaml")
model_with_param_path = str(Path(__file__).parents[1] / "gaml/experiment_with_params.gaml")
runtime_error_model_path = str(Path(__file__).parents[1] / "gaml/runtime_error.gaml")
url = "localhost"
port = 6868


class TestValidate(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient
    sim_id: List[str]

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=10)
        self.client.connect()
        self.sim_id = []

    async def test_empty_text(self):
        assert False

    async def test_none_text(self):
        assert False

    async def test_no_model_name(self):
        assert False

    async def test_minimal_passing(self):
        assert False

    async def test_forget_last_closing_bracket(self):
        assert False
        
    async def test_full_example_syntax_error(self):
        text_to_test = "model CrowdSimulation\n\nglobal {\n    int number_of_agents <- 100; // Number of people in the crowd\n    float max_speed <- 2#m/s;     // Maximum speed for each agent\n    geometry world_shape <- square(100); // Define the boundaries of the simulation area as a square with side length 100 meters\n\n    init {\n        create agents number: number_of_agents;\n    }\n}\n\nspecies agent skills:[moving] {\n    float speed <- max_speed / 2 + rand(max_speed / 2); // Randomize initial speed within half to full of max speed\n    point target_location; // Where the agent is moving towards\n\n    reflex move_around when: (target_location = nil or distance(target_location) < 1#m) {\n        target_location <- any_point_in(world_shape); // Set a new random target location within the world boundaries\n    }\n\n    reflex go_to_target {\n        do goto target: target_location speed: speed; // Move towards the target location at the given speed\n    }\n}\n\nexperiment CrowdExperiment type: gui {\n    output display my_display {\n        species_layer agents;\n    }\n}"
        gama_response = self.client.validate(text_to_test, True, True)
        assert gama_response["type"] == MessageTypes.UnableToExecuteRequest.value

    async def test_semantic_error_returned(self):
        assert False

    async def test_semantic_error_not_returned(self):
        assert False

    async def asyncTearDown(self):
        for id in self.sim_id:
            self.client.stop(id)
        self.client.close_connection()
