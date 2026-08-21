/**
 * Ask tests — https://github.com/gama-platform/gama.clients/issues/25
 *
 * `ask` had no test coverage at all. The reported crash comes from the `agent`
 * parameter: gama-server resolves it as an `AgentReference` (`simulation[0]`,
 * `simulation[0].people[42]`, ...), so a species or variable name such as
 * `"world"` makes it throw an ArrayIndexOutOfBoundsException server-side instead
 * of answering. The client now rejects those references before sending.
 *
 * Behaviours asserted here were first observed on a live gama-server; the
 * comments record the answers it actually sends.
 */
import { MessageTypes } from '../src/constants.ts';
import { MODEL_ACTIONS } from './helpers.ts';
import { useClient } from './fixtures.ts';

const ctx = useClient();

beforeEach(async () => {
    await ctx.load(MODEL_ACTIONS, 'ex');
});


// ─── Agent reference validation (issue #25) ───────────────────────────────────

describe('ask agent reference', () => {
    it.each(['world', 'thing', 'simulation', '', 'simulation[0].', 'simulation[a]'])(
        'rejects %p, which crashes gama-server instead of returning an error',
        async (agent) => {
            await expect(ctx.client.ask('getStaticSpecies', '{}', agent))
                .rejects.toThrow(/not a valid agent reference/);
        }
    );

    it('accepts a simulation reference', async () => {
        const resp = await ctx.client.ask('getStaticSpecies', '{}', 'simulation[0]');
        expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    });

    it('accepts a nested species reference', async () => {
        const resp = await ctx.client.ask('getVal', '{}', 'simulation[0].thing[1]');
        expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    });

    it('reports an unknown species in the reference instead of crashing', async () => {
        await expect(ctx.client.ask('getVal', '{}', 'simulation[0].nosuch[0]'))
            .rejects.toThrow(/Agent does not exist: simulation\[0\]\.nosuch\[0\]/);
    });
});

// ─── Args normalisation ───────────────────────────────────────────────────────

describe('ask args', () => {
    it('rejects a JSON array, which the server turns into no argument at all', async () => {
        // This is the call from the issue: ask("getStaticSpecies", "[]", "world").
        // gama-server answers CommandExecutedSuccessfully for "[]" but the action
        // runs with every argument unset, so the failure is silent without this check.
        await expect(ctx.client.ask('bump', '[]', 'simulation[0]'))
            .rejects.toThrow(/must be a JSON object/);
    });

    it('rejects a non-JSON string', async () => {
        await expect(ctx.client.ask('bump', 'not json', 'simulation[0]'))
            .rejects.toThrow(/must be a JSON object/);
    });

    it('passes the arguments of an object to the action', async () => {
        await ctx.client.ask('bump', { nb: 5 }, 'simulation[0]');
        expect((await ctx.client.expression('simulation.counter')).content).toBe(5);
    });

    it('passes the arguments of a JSON object string to the action', async () => {
        await ctx.client.ask('bump', '{"nb": 4}', 'simulation[0]');
        expect((await ctx.client.expression('simulation.counter')).content).toBe(4);
    });

    it('accumulates across successive calls', async () => {
        await ctx.client.ask('bump', { nb: 5 }, 'simulation[0]');
        await ctx.client.ask('bump', { nb: 3 }, 'simulation[0]');
        expect((await ctx.client.expression('simulation.counter')).content).toBe(8);
    });

    it('defaults to no argument when args is omitted', async () => {
        const resp = await ctx.client.ask('getStaticSpecies', undefined, 'simulation[0]');
        expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    });
});

// ─── Execution ────────────────────────────────────────────────────────────────

describe('ask execution', () => {
    it('runs an action with no argument', async () => {
        const resp = await ctx.client.ask('getStaticSpecies', '{}', 'simulation[0]');
        expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    });

    it('does not return the action result — use expression() for that', async () => {
        // gama-server discards the execution result and answers with empty content.
        // Documented so the day it changes, this test tells us.
        const resp = await ctx.client.ask('getStaticSpecies', '{}', 'simulation[0]');
        expect(resp.content).toBe('');

        const evaluated = await ctx.client.expression('simulation.getStaticSpecies()');
        expect(evaluated.content).toEqual(['province', 'park', 'road']);
    });

    it('reports a missing action rather than succeeding', async () => {
        await expect(ctx.client.ask('does_not_exist', '{}', 'simulation[0]'))
            .rejects.toThrow(/Action does_not_exist does not exist in agent simulation\[0\]/);
    });

    it('reports a runtime error raised by the action', async () => {
        await expect(ctx.client.ask('fail', '{}', 'simulation[0]'))
            .rejects.toThrow(/Division by zero/);
    });

    it('targets the experiment agent when no agent is given', async () => {
        // Omitting the key is what makes the server fall back to the experiment
        // agent (ref == null); sending "" instead reaches AgentReference and crashes.
        // The experiment agent is not `world`, so actions declared in `global` are
        // out of reach that way — hence "agent null" in the answer.
        await expect(ctx.client.ask('getStaticSpecies'))
            .rejects.toThrow(/Action getStaticSpecies does not exist in agent null/);
    });

    it('accepts an explicit exp_id', async () => {
        const resp = await ctx.client.ask('getStaticSpecies', '{}', 'simulation[0]', false, ctx.client.getExperimentId());
        expect(resp.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    });
});

// ─── Known server-side quirk, kept as a todo ──────────────────────────────────

// gama-server resolves references through IPopulation.getOrCreateAgent, so an
// out-of-range index such as simulation[0].thing[99] silently creates an agent
// instead of reporting that it does not exist. Worth a server-side issue.
test.todo('ask on an out-of-range agent index should report a missing agent');
