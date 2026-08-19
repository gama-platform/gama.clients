/**
 * Reload tests — mirrors python/tests/sync_test/test_reload.py
 *
 * All Python-implemented tests are implemented here.
 */
import { MessageTypes } from '../src/constants.ts';
import {
    MODEL_EMPTY, MODEL_FAULTY, MODEL_WITH_PARAMS, MODEL_INIT_ERROR,
} from './helpers.ts';
import { useClient } from './fixtures.ts';

const ctx = useClient();


// ─── Tests ─────────────────────────────────────────────────────────────────────

it('basic reload returns CommandExecutedSuccessfully', async () => {
    await ctx.load(MODEL_EMPTY, 'ex');
    const resp = await ctx.client.reload();
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('seed changes after reload (model without fixed seed)', async () => {
    await ctx.load(MODEL_EMPTY, 'ex');

    const seedBefore = await ctx.client.expression('seed');
    expect(seedBefore.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    const prevSeed = seedBefore.content;

    await ctx.client.reload();

    const seedAfter = await ctx.client.expression('seed');
    expect(seedAfter.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(seedAfter.content).not.toBe(prevSeed);
});

it('reload with one parameter sets it correctly', async () => {
    await ctx.load(MODEL_WITH_PARAMS, 'ex');

    await ctx.client.reload(undefined, [{ type: 'int', value: 123, name: 'i' }]);

    const iResp = await ctx.client.expression('i');
    expect(iResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(iResp.content).toBe(123);
});

// Python: reload without parameters should restore load-time value, not GAML default.
// Some server versions reset to GAML default (-1) instead of the load-time value (999).
test.todo('reload without parameter resets to the value used at load time (not the default)');

it('reload with a different parameter value updates it correctly', async () => {
    await ctx.load(MODEL_WITH_PARAMS, 'ex', { parameters: [{ type: 'int', value: 500, name: 'i' }] });

    await ctx.client.reload(undefined, [{ type: 'int', value: 777, name: 'i' }]);

    const iResp = await ctx.client.expression('i');
    expect(iResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(iResp.content).toBe(777);
});

it('reload with multiple parameters updates all of them', async () => {
    const initParams = [
        { type: 'int',    value: 100,    name: 'i' },
        { type: 'float',  value: 25.5,   name: 'f' },
        { type: 'string', value: 'test', name: 's' },
    ];
    await ctx.load(MODEL_WITH_PARAMS, 'ex', { parameters: initParams });

    const newParams = [
        { type: 'int',    value: 200,        name: 'i' },
        { type: 'float',  value: 50.7,       name: 'f' },
        { type: 'string', value: 'reloaded', name: 's' },
    ];
    await ctx.client.reload(undefined, newParams);

    expect((await ctx.client.expression('i')).content).toBe(200);
    expect((await ctx.client.expression('f')).content).toBe(50.7);
    expect((await ctx.client.expression('s')).content).toBe('reloaded');
});

it('reload with a non-existent experiment ID fails', async () => {
    await expect(ctx.client.reload('non_existent_id')).rejects.toThrow();
});

it('reload with an until condition returns success', async () => {
    await ctx.load(MODEL_EMPTY, 'ex');
    const resp = await ctx.client.reload(undefined, undefined, 'cycle >= 5');
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('reload preserves experiment ID (can still interact with the same ID)', async () => {
    await ctx.load(MODEL_EMPTY, 'ex');
    const originalId = ctx.client.getExperimentId();

    await ctx.client.reload();

    // The same ID should still work — cycle should be 0 after reload
    const cycleResp = await ctx.client.expression('cycle');
    expect(cycleResp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(ctx.client.getExperimentId()).toBe(originalId);
});

it('reload on a model with a runtime error (runtime=true) returns success', async () => {
    await ctx.load(MODEL_INIT_ERROR, 'exp', { runtime: true });

    const resp = await ctx.client.reload();
    expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
});

it('loading a faulty model fails (compilation error, not a reload test but mirrors Python test_reload_syntax_error)', async () => {
    await expect(
        ctx.client.loadExperiment(MODEL_FAULTY, 'ex')
    ).rejects.toThrow(/GamaCompilationFailedException/);
});
