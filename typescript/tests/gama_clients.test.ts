/**
 * Core GamaClient behaviour tests.
 * Cover: connection, play/pause/stop/step lifecycle using the shared empty model.
 */
import { GAMA_HOST, GAMA_PORT, MODEL_EMPTY } from './helpers.ts';
import { useClient } from './fixtures.ts';

const ctx = useClient();


// ─── Connection ────────────────────────────────────────────────────────────────

describe('connection', () => {
    it('reports correct port and host after connecting', () => {
        expect(ctx.client.getPort()).toBe(GAMA_PORT);
        expect(ctx.client.getHost()).toBe(GAMA_HOST);
        expect(ctx.client.isConnected()).toBe(true);
    });
});

// ─── Load ──────────────────────────────────────────────────────────────────────

describe('loadExperiment', () => {
    it('sets experiment state to PAUSED after successful load', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        expect(ctx.client.getExperimentState()).toBe('PAUSED');
    });

    it('stores the experiment ID the load answer carried', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        // The id must come from the load answer, which is the key gama-server files the
        // experiment under (GamaHeadlessWebSocketServer.addExperiment). Its shape depends
        // on the server: headless returns a generated id, a GUI server returns the
        // experiment name — so only "present and usable" can be asserted here, not "not
        // the experiment name". It must never come from a SimulationStatus frame, whose
        // exp_id is a per-socket index that no lookup accepts (see issue #24).
        const id = ctx.client.getExperimentId();
        expect(id).not.toBe('');
        // usable: a command routed with this id reaches the experiment
        expect((await ctx.client.expression('1+1', id)).content).toBe(2);
    });

    it('stores model path and experiment name', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        expect(ctx.client.getModelPath()).toBe(MODEL_EMPTY);
        expect(ctx.client.getExperimentName()).toBe('ex');
    });
});

// ─── Play ──────────────────────────────────────────────────────────────────────

describe('play', () => {
    it('transitions state to RUNNING', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        await ctx.client.play();
        // Allow SimulationStatus update to propagate
        await new Promise(r => setTimeout(r, 200));
        expect(ctx.client.getExperimentState()).toBe('RUNNING');
    });

    it('calling play again while RUNNING does not throw', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        await ctx.client.play();
        await ctx.client.play(); // no-op: logs warning, does not throw
    });
});

// ─── Pause ─────────────────────────────────────────────────────────────────────

describe('pause', () => {
    it('transitions state back to PAUSED', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        await ctx.client.play();
        await ctx.client.pause();
        expect(ctx.client.getExperimentState()).toBe('PAUSED');
    });

    it('calling pause twice does not throw', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        await ctx.client.pause(); // already paused — send pause again
        await ctx.client.pause();
        expect(ctx.client.getExperimentState()).toBe('PAUSED');
    });
});

// ─── Stop ──────────────────────────────────────────────────────────────────────

describe('stop', () => {
    it('transitions state to NONE after play+pause+stop', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        await ctx.client.play();
        await ctx.client.pause();
        await ctx.client.stop();
        expect(ctx.client.getExperimentState()).toBe('NONE');
    });

    it('is a no-op and does not throw when state is already NONE', async () => {
        // Do not load anything — state starts at NONE
        await ctx.client.stop(); // should log warning and return
        expect(ctx.client.getExperimentState()).toBe('NONE');
    });
});

// ─── Step ──────────────────────────────────────────────────────────────────────

describe('step', () => {
    it('returns CommandExecutedSuccessfully for a single step', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        const resp = await ctx.client.step();
        const msg = resp;
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });

    it('handles nb_step > 1 correctly', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        const resp = await ctx.client.step(16, true);
        const msg = resp;
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });
});

// ─── Reload ────────────────────────────────────────────────────────────────────

describe('reload', () => {
    it('returns CommandExecutedSuccessfully', async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
        const resp = await ctx.client.reload();
        const msg = resp;
        expect(msg.type).toBe('CommandExecutedSuccessfully');
    });
});
