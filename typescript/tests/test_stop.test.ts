/**
 * Stop / experiment-state tests —
 * https://github.com/gama-platform/gama.clients/issues/28, /29 and /30
 *
 * Observed on a live gama-server: stopping a RUNNING experiment makes it emit
 * SimulationStatus "NOTREADY", "NONE" and then a trailing "PAUSED", while stopping a
 * PAUSED one stops at "NONE". The trailing PAUSED is spurious — the experiment is gone
 * either way, and any command sent afterwards answers "Unable to find the experiment or
 * simulation". The client therefore settles on NONE once the server has acknowledged the
 * stop, whatever the last status said.
 */
import GamaClient from '../src/gama_client.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_COMPLETE, MODEL_SLOW, MODEL_RUNTIME_ERROR } from './helpers.ts';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

let client: GamaClient;

beforeEach(async () => {
    client = new GamaClient(GAMA_PORT, GAMA_HOST);
    await client.connectGama();
});

afterEach(async () => {
    try { await client.stop(); } catch { /* ignore */ }
    await client.closeConnection();
});

// ─── #28 — one final state, whatever the previous one ────────────────────────

describe('final state after stop (#28)', () => {
    it('ends on NONE when the experiment was PAUSED', async () => {
        await client.loadExperiment(MODEL_COMPLETE, 'expe');
        expect(client.getExperimentState()).toBe('PAUSED');
        await client.stop();
        expect(client.getExperimentState()).toBe('NONE');
    });

    it('ends on NONE when the experiment was RUNNING', async () => {
        // The case that used to leave the client reporting PAUSED for a dead experiment.
        await client.loadExperiment(MODEL_COMPLETE, 'expe');
        await client.play();
        await wait(1500);
        expect(client.getExperimentState()).toBe('RUNNING');
        await client.stop();
        await wait(1500); // let the trailing spurious PAUSED arrive
        expect(client.getExperimentState()).toBe('NONE');
    });
});

// ─── #29 — stop() resolves only once the experiment is really gone ───────────

describe('stop() timing (#29)', () => {
    it('leaves nothing running by the time it resolves', async () => {
        await client.loadExperiment(MODEL_SLOW, 'ex');
        const id = client.getExperimentId();
        await client.play();
        await wait(2000);
        await client.stop();

        // No sleep here on purpose: the state must already be final when stop() returns.
        expect(client.getExperimentState()).toBe('NONE');
        // The client also forgets the id, so it refuses to route anything there itself...
        await expect(client.expression('cycle')).rejects.toThrow(/no current experiment/);
        // ...and the experiment is genuinely gone server-side, not merely reported stopped.
        await expect(client.expression('cycle', id)).rejects.toThrow(/Unable to find the experiment/);
    });
});

// ─── #30 — telling a crash apart from a deliberate pause ─────────────────────

describe('interrupted experiments (#30)', () => {
    it('flags an experiment that stopped running on its own', async () => {
        // A runtime error moves the experiment from RUNNING to PAUSED and, on the versions
        // tested, gama-server sends no error message at all — even with runtime: true. The
        // client can only tell by remembering that nobody asked for the pause.
        await client.loadExperiment(MODEL_RUNTIME_ERROR, 'exp', undefined, undefined, undefined, true);
        expect(client.wasInterrupted()).toBe(false);
        await client.play();
        await wait(3000);

        expect(client.getExperimentState()).toBe('PAUSED');
        expect(client.wasInterrupted()).toBe(true);
    });

    it('does not flag an experiment the client paused itself', async () => {
        await client.loadExperiment(MODEL_COMPLETE, 'expe');
        await client.play();
        await wait(1500);
        await client.pause();
        await wait(1500);

        expect(client.getExperimentState()).toBe('PAUSED');
        expect(client.wasInterrupted()).toBe(false);
    });

    it('clears the flag when a new experiment is loaded', async () => {
        await client.loadExperiment(MODEL_RUNTIME_ERROR, 'exp', undefined, undefined, undefined, true);
        await client.play();
        await wait(3000);
        expect(client.wasInterrupted()).toBe(true);

        await client.stop();
        await client.loadExperiment(MODEL_COMPLETE, 'expe');
        expect(client.wasInterrupted()).toBe(false);
    });
});
