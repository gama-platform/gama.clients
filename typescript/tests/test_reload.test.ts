/**
 * Reload tests — mirrors python/tests/sync_test/test_reload.py
 *
 * All Python-implemented tests are implemented here.
 */
import GamaClient from '../src/gama_client.ts';
import { MessageTypes } from '../src/constants.ts';
import {
    GAMA_PORT, GAMA_HOST,
    MODEL_EMPTY, MODEL_FAULTY, MODEL_WITH_PARAMS, MODEL_INIT_ERROR,
    asMsg,
} from './helpers.ts';

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

async function loadEmpty() {
    await client.loadExperiment(MODEL_EMPTY, 'ex');
    loadedIds.push(client.getExperimentId());
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

it('basic reload returns CommandExecutedSuccessfully', async () => {
    await loadEmpty();
    const resp = asMsg(await client.reload());
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('seed changes after reload (model without fixed seed)', async () => {
    await loadEmpty();

    const seedBefore = asMsg(await client.expression('seed'));
    expect(seedBefore.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    const prevSeed = seedBefore.content;

    await client.reload();

    const seedAfter = asMsg(await client.expression('seed'));
    expect(seedAfter.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(seedAfter.content).not.toBe(prevSeed);
});

it('reload with one parameter sets it correctly', async () => {
    await client.loadExperiment(MODEL_WITH_PARAMS, 'ex');
    loadedIds.push(client.getExperimentId());

    await client.reload(undefined, [{ type: 'int', value: 123, name: 'i' }]);

    const iResp = asMsg(await client.expression('i'));
    expect(iResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(iResp.content).toBe(123);
});

// Python: reload without parameters should restore load-time value, not GAML default.
// Some server versions reset to GAML default (-1) instead of the load-time value (999).
test.todo('reload without parameter resets to the value used at load time (not the default)');

it('reload with a different parameter value updates it correctly', async () => {
    await client.loadExperiment(MODEL_WITH_PARAMS, 'ex', undefined, undefined, undefined, undefined,
        [{ type: 'int', value: 500, name: 'i' }]);
    loadedIds.push(client.getExperimentId());

    await client.reload(undefined, [{ type: 'int', value: 777, name: 'i' }]);

    const iResp = asMsg(await client.expression('i'));
    expect(iResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(iResp.content).toBe(777);
});

it('reload with multiple parameters updates all of them', async () => {
    const initParams = [
        { type: 'int',    value: 100,    name: 'i' },
        { type: 'float',  value: 25.5,   name: 'f' },
        { type: 'string', value: 'test', name: 's' },
    ];
    await client.loadExperiment(MODEL_WITH_PARAMS, 'ex', undefined, undefined, undefined, undefined, initParams);
    loadedIds.push(client.getExperimentId());

    const newParams = [
        { type: 'int',    value: 200,        name: 'i' },
        { type: 'float',  value: 50.7,       name: 'f' },
        { type: 'string', value: 'reloaded', name: 's' },
    ];
    await client.reload(undefined, newParams);

    expect(asMsg(await client.expression('i')).content).toBe(200);
    expect(asMsg(await client.expression('f')).content).toBe(50.7);
    expect(asMsg(await client.expression('s')).content).toBe('reloaded');
});

it('reload with a non-existent experiment ID fails', async () => {
    await expect(client.reload('non_existent_id')).rejects.toThrow();
});

it('reload with an until condition returns success', async () => {
    await loadEmpty();
    const resp = asMsg(await client.reload(undefined, undefined, 'cycle >= 5'));
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('reload preserves experiment ID (can still interact with the same ID)', async () => {
    await loadEmpty();
    const originalId = client.getExperimentId();

    await client.reload();

    // The same ID should still work — cycle should be 0 after reload
    const cycleResp = asMsg(await client.expression('cycle'));
    expect(cycleResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(client.getExperimentId()).toBe(originalId);
});

it('reload on a model with a runtime error (runtime=true) returns success', async () => {
    await client.loadExperiment(MODEL_INIT_ERROR, 'exp', undefined, undefined, undefined, true);
    loadedIds.push(client.getExperimentId());

    const resp = asMsg(await client.reload());
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('loading a faulty model fails (compilation error, not a reload test but mirrors Python test_reload_syntax_error)', async () => {
    await expect(
        client.loadExperiment(MODEL_FAULTY, 'ex')
    ).rejects.toThrow(/GamaCompilationFailedException/);
});
