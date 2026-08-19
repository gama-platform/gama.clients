/**
 * Answer correlation — https://github.com/gama-platform/gama.clients/issues/27
 *
 * Answers used to be matched on message type alone, so an answer nobody was waiting for
 * any more — a timed-out command, or one of the extra frames gama-server emits alongside
 * an error — was consumed by the next command. From then on every command was one answer
 * behind, and the client could not recover without a manual reconnect.
 *
 * Each command now carries a `client_command_id` that the server echoes back.
 */
import GamaClient from '../src/gama_client.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_EMPTY } from './helpers.ts';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── #27 — every command gets its own answer ─────────────────────────────────

describe('answer correlation (#27)', () => {
    let client: GamaClient;

    beforeEach(async () => {
        client = new GamaClient(GAMA_PORT, GAMA_HOST);
        await client.connectGama();
        await client.loadExperiment(MODEL_EMPTY, 'ex');
    });

    afterEach(async () => {
        try { await client.stop(); } catch { /* ignore */ }
        await client.closeConnection();
    });

    it('ignores an answer left behind by an abandoned command', async () => {
        // Fire a command without awaiting it: this is what a timed-out command leaves on
        // the wire. Without correlation the next command consumes this answer instead of
        // its own, and every later command stays one answer behind for good.
        (client as unknown as { sendPayload(p: Record<string, unknown>): string })
            .sendPayload({ type: 'expression', exp_id: client.getExperimentId(), expr: '111' });

        expect((await client.expression('222')).content).toBe(222);
        expect((await client.expression('333')).content).toBe(333);
    });

    it('stays usable after a command has timed out', async () => {
        const c = client as unknown as {
            sendPayload(p: Record<string, unknown>): string;
            success(m: string, t?: number, id?: string): Promise<unknown>;
        };
        // Leave an answer on the wire that no caller will take...
        c.sendPayload({ type: 'expression', exp_id: client.getExperimentId(), expr: '42' });
        // ...and put the client through a real timeout: this model never ends, so
        // SimulationEnded never comes and the wait can only expire.
        await expect(c.success('SimulationEnded', 500)).rejects.toThrow(/Timed out/);
        await wait(800);

        // The reported symptom was that every command after a timeout failed too.
        expect((await client.expression('7*6')).content).toBe(42);
        await expect(client.stop()).resolves.toBeDefined();
    });
});
