/**
 * Session robustness — https://github.com/gama-platform/gama.clients/issues/24 and /27
 *
 * Two failure modes that share a cause: frames arriving on the socket were matched to
 * whatever the client happened to be waiting for.
 *
 *  - gama-server broadcasts SimulationStatus to *every* open connection, and the exp_id
 *    they carry is a per-socket index rather than the id `load` answered with. A client
 *    that adopted them believed it owned another session's experiment (#24).
 *  - Answers were matched on message type alone, so an answer nobody was waiting for any
 *    more (a timed-out command, or one of the extra frames gama-server emits with an
 *    error) was consumed by the next command (#27).
 */
import GamaClient from '../src/gama_client.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_EMPTY, MODEL_COMPLETE } from './helpers.ts';
import { useClient, wait } from './fixtures.ts';

// ─── #27 — every command gets its own answer ─────────────────────────────────

describe('answer correlation (#27)', () => {
    const ctx = useClient();

    beforeEach(async () => {
        await ctx.load(MODEL_EMPTY, 'ex');
    });

    it('ignores an answer left behind by an abandoned command', async () => {
        // Fire a command without awaiting it: this is what a timed-out command leaves on
        // the wire. Without correlation the next command consumes this answer instead of
        // its own, and every later command stays one answer behind for good.
        (ctx.client as unknown as { sendPayload(p: Record<string, unknown>): string })
            .sendPayload({ type: 'expression', exp_id: ctx.client.getExperimentId(), expr: '111' });

        expect((await ctx.client.expression('222')).content).toBe(222);
        expect((await ctx.client.expression('333')).content).toBe(333);
    });

    it('stays usable after a command has timed out', async () => {
        const c = ctx.client as unknown as {
            sendPayload(p: Record<string, unknown>): string;
            success(m: string, t?: number, id?: string): Promise<unknown>;
        };
        // Leave an answer on the wire that no caller will take...
        c.sendPayload({ type: 'expression', exp_id: ctx.client.getExperimentId(), expr: '42' });
        // ...and put the client through a real timeout: this model never ends, so
        // SimulationEnded never comes and the wait can only expire.
        await expect(c.success('SimulationEnded', 500)).rejects.toThrow(/Timed out/);
        await wait(800);

        // The reported symptom was that every command after a timeout failed too.
        expect((await ctx.client.expression('7*6')).content).toBe(42);
        await expect(ctx.client.stop()).resolves.toBeDefined();
    });
});

// ─── #24 — one client must not pick up another session's experiment ──────────

describe('session isolation (#24)', () => {
    it('a fresh client ignores the statuses broadcast for another connection', async () => {
        const owner = new GamaClient(GAMA_PORT, GAMA_HOST);
        const bystander = new GamaClient(GAMA_PORT, GAMA_HOST);
        await owner.connectGama();
        await bystander.connectGama();
        try {
            await owner.loadExperiment(MODEL_COMPLETE, 'expe');
            await owner.play();
            await wait(1500);
            await owner.stop();
            await wait(2000); // the bystander is showered with the owner's statuses here

            // This is what the browser-reload race turned into: the new page's client
            // believed it had an experiment and tried to stop one that was never its own,
            // which answered "Unable to find the experiment or simulation".
            expect(bystander.getExperimentState()).toBe('NONE');
            expect(bystander.getExperimentId()).toBe('');
        } finally {
            await owner.closeConnection();
            await bystander.closeConnection();
        }
    });

    it('disposeSync() releases everything without awaiting, and the next client can load', async () => {
        const leaving = new GamaClient(GAMA_PORT, GAMA_HOST);
        await leaving.connectGama();
        await leaving.loadExperiment(MODEL_COMPLETE, 'expe');
        await leaving.play();
        await wait(1000);

        // No await: a browser unloading the page does not wait for async handlers either.
        leaving.disposeSync();
        expect(leaving.getExperimentState()).toBe('NONE');
        expect(leaving.getExperimentId()).toBe('');
        expect(leaving.isConnected()).toBe(false);

        await wait(2000);
        const arriving = new GamaClient(GAMA_PORT, GAMA_HOST);
        await arriving.connectGama();
        try {
            await expect(arriving.loadExperiment(MODEL_COMPLETE, 'expe')).resolves.toBeUndefined();
            await arriving.stop();
        } finally {
            await arriving.closeConnection();
        }
    });

    it('disposeSync() on a client that never loaded anything is harmless', async () => {
        const c = new GamaClient(GAMA_PORT, GAMA_HOST);
        await c.connectGama();
        expect(() => c.disposeSync()).not.toThrow();
        expect(c.isConnected()).toBe(false);
    });
});
