/**
 * Validate tests — mirrors python/tests/sync_test/test_validate.py
 *
 * Python tests that are `assert False` are represented as test.todo().
 */
import GamaClient from '../src/gama_client.ts';
import { GAMA_PORT, GAMA_HOST, asMsg } from './helpers.ts';
import { MessageTypes } from '../src/constants.ts';

let client: GamaClient;

beforeEach(async () => {
    client = new GamaClient(GAMA_PORT, GAMA_HOST);
    await client.connectGama();
});

afterEach(async () => {
    await client.closeConnection();
});

// ─── Implemented (mirrors Python's implemented test) ──────────────────────────

it('validate code with a syntax error in the model returns UnableToExecuteRequest', async () => {
    // This is the exact code from Python's test_full_example_syntax_error
    // It contains a syntax error: `distance(target_location)` should be `self distance_to target_location`
    const code = [
        'model CrowdSimulation',
        '',
        'global {',
        '    int number_of_agents <- 100;',
        '    float max_speed <- 2#m/s;',
        '    geometry world_shape <- square(100);',
        '',
        '    init {',
        '        create agents number: number_of_agents;',
        '    }',
        '}',
        '',
        'species agent skills:[moving] {',
        '    float speed <- max_speed / 2 + rand(max_speed / 2);',
        '    point target_location;',
        '',
        '    reflex move_around when: (target_location = nil or distance(target_location) < 1#m) {',
        '        target_location <- any_point_in(world_shape);',
        '    }',
        '',
        '    reflex go_to_target {',
        '        do goto target: target_location speed: speed;',
        '    }',
        '}',
        '',
        'experiment CrowdExperiment type: gui {',
        '    output display my_display {',
        '        species_layer agents;',
        '    }',
        '}',
    ].join('\n');

    // syntax=true, escaped=true as in Python
    await expect(client.validate(code, true, true)).rejects.toThrow();
});

it('validate well-formed GAML expression returns success', async () => {
    const code = 'model MinimalModel\n\nexperiment ex;\n';
    const resp = asMsg(await client.validate(code, false, false));
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

// ─── Not yet implemented in Python ────────────────────────────────────────────

test.todo('validate empty text');
test.todo('validate null / undefined text');
test.todo('validate without model name');
test.todo('validate minimal passing code (syntax only)');
test.todo('validate code missing closing bracket');
test.todo('validate code with semantic error — returned when syntax=false');
test.todo('validate code with semantic error — not returned when syntax=true');
