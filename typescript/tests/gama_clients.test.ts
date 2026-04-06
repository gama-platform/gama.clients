/**
 * Core GamaClient behaviour tests.
 * Cover: connection, play/pause/stop/step lifecycle using the shared empty model.
 */
import GamaClient from '../src/gama_client.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_EMPTY, asMsg } from './helpers.ts';

let client: GamaClient;

beforeEach(async () => {
    client = new GamaClient(GAMA_PORT, GAMA_HOST);
    await client.connectGama();
});

afterEach(async () => {
    if (client.getExperimentState() !== 'NONE') {
        await client.stop();
    }
    await client.closeConnection();
});

// ─── Connection ────────────────────────────────────────────────────────────────

describe('connection', () => {
    it('reports correct port and host after connecting', () => {
        expect(client.getPort()).toBe(GAMA_PORT);
        expect(client.getHost()).toBe(GAMA_HOST);
        expect(client.isConnected()).toBe(true);
    });
});

// ─── Load ──────────────────────────────────────────────────────────────────────

describe('loadExperiment', () => {
    it('sets experiment state to PAUSED after successful load', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        expect(client.getExperimentState()).toBe('PAUSED');
    });

    it('stores server-assigned experiment ID (not the experiment name)', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        // Server assigns a numeric ID; it must not equal the experiment name
        const id = client.getExperimentId();
        expect(id).not.toBe('ex');
        expect(id).not.toBe('');
    });

    it('stores model path and experiment name', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        expect(client.getModelPath()).toBe(MODEL_EMPTY);
        expect(client.getExperimentName()).toBe('ex');
    });
});

// ─── Play ──────────────────────────────────────────────────────────────────────

describe('play', () => {
    it('transitions state to RUNNING', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        await client.play();
        // Allow SimulationStatus update to propagate
        await new Promise(r => setTimeout(r, 200));
        expect(client.getExperimentState()).toBe('RUNNING');
    });

    it('calling play again while RUNNING does not throw', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        await client.play();
        await client.play(); // no-op: logs warning, does not throw
    });
});

// ─── Pause ─────────────────────────────────────────────────────────────────────

describe('pause', () => {
    it('transitions state back to PAUSED', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        await client.play();
        await client.pause();
        expect(client.getExperimentState()).toBe('PAUSED');
    });

    it('calling pause twice does not throw', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        await client.pause(); // already paused — send pause again
        await client.pause();
        expect(client.getExperimentState()).toBe('PAUSED');
    });
});

// ─── Stop ──────────────────────────────────────────────────────────────────────

describe('stop', () => {
    it('transitions state to NONE after play+pause+stop', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        await client.play();
        await client.pause();
        await client.stop();
        expect(client.getExperimentState()).toBe('NONE');
    });

    it('is a no-op and does not throw when state is already NONE', async () => {
        // Do not load anything — state starts at NONE
        await client.stop(); // should log warning and return
        expect(client.getExperimentState()).toBe('NONE');
    });
});

// ─── Step ──────────────────────────────────────────────────────────────────────

describe('step', () => {
    it('returns CommandExecutedSuccessfully for a single step', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        const resp = await client.step();
        const msg = asMsg(resp);
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });

    it('handles nb_step > 1 correctly', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        const resp = await client.step(16, true);
        const msg = asMsg(resp);
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });
});

// ─── Reload ────────────────────────────────────────────────────────────────────

describe('reload', () => {
    it('returns CommandExecutedSuccessfully', async () => {
        await client.loadExperiment(MODEL_EMPTY, 'ex');
        const resp = await client.reload();
        const msg = asMsg(resp);
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });
});
