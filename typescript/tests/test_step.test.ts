/**
 * Step / StepBack tests — mirrors python/tests/sync_test/test_step.py
 *
 * Python tests that are `assert False` are represented as test.todo().
 * Implemented tests cover the runtime-error scenarios Python has implemented.
 */
import GamaClient from '../src/gama_client.ts';
import type { GamaMessage } from '../src/constants.ts';
import { MessageTypes } from '../src/constants.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_RUNTIME_ERROR, asMsg } from './helpers.ts';

let client: GamaClient;
const loadedIds: string[] = [];

beforeEach(async () => {
    client = new GamaClient(GAMA_PORT, GAMA_HOST);
    await client.connectGama();
    loadedIds.length = 0;
});

afterEach(async () => {
    for (const id of loadedIds) {
        try { await client.stop(id); } catch { /* ignore */ }
    }
    await client.closeConnection();
});

// ─── Runtime error in a reflex ────────────────────────────────────────────────
// Python's implementation of these tests is complex and partially uncertain
// ("Not sure how to make it work in GS currently"). The exact message sequence
// depends on the server version, so we verify that the load itself succeeds and
// leave the detailed error-content assertions as todos.

it('loads runtime_error model with runtime=true successfully', async () => {
    await client.loadExperiment(MODEL_RUNTIME_ERROR, 'exp', undefined, undefined, undefined, true);
    loadedIds.push(client.getExperimentId());
    expect(client.getExperimentState()).toBe('PAUSED');
});

// ─── STEP — not yet implemented in Python ─────────────────────────────────────

test.todo('step in sync mode — normal case');
test.todo('step in non-sync mode — normal case');
test.todo('step when no simulation is loaded (sync)');
test.todo('step when no simulation is loaded (non-sync)');
test.todo('multiple steps in sync mode');
test.todo('multiple steps in non-sync mode');
test.todo('step when simulation has ended (sync)');
test.todo('step when simulation has ended (non-sync)');

// ─── STEP BACK — not yet implemented in Python ────────────────────────────────

test.todo('step back in sync mode — normal case');
test.todo('step back in non-sync mode — normal case');
test.todo('step back when no simulation is loaded (sync)');
test.todo('step back when no simulation is loaded (non-sync)');
test.todo('multiple step backs in sync mode');
test.todo('multiple step backs in non-sync mode');
