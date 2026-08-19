/**
 * Response typing — https://github.com/gama-platform/gama.clients/issues/26
 *
 * Every command answers with the message object gama-server sent — `type`, `content` and
 * the echoed `command` — but the methods used to be declared `Promise<string>`, so reading
 * `.content` was a type error and callers had to cast. They now return `GamaMessage`.
 *
 * `content` is deliberately `unknown`: its shape follows the command (a string for `load`,
 * a number for an arithmetic expression, an array for a list-returning one, a nested
 * object for `describe`), so callers narrow it themselves.
 */
import GamaClient from '../src/gama_client.ts';
import { MessageTypes } from '../src/constants.ts';
import { GAMA_PORT, GAMA_HOST, MODEL_EMPTY } from './helpers.ts';

let client: GamaClient;

beforeEach(async () => {
    client = new GamaClient(GAMA_PORT, GAMA_HOST);
    await client.connectGama();
});

afterEach(async () => {
    try { await client.stop(); } catch { /* ignore */ }
    await client.closeConnection();
});

it('expression() answers with type, content and the echoed command', async () => {
    await client.loadExperiment(MODEL_EMPTY, 'ex');
    const response = await client.expression('1+1');

    expect(response.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    expect(response.content).toBe(2);
    expect(response.command).toMatchObject({ type: 'expression' });
});

it('expression() keeps the content’s own shape', async () => {
    // The issue's example: a list-returning expression answers with an array, not a string.
    await client.loadExperiment(MODEL_EMPTY, 'ex');
    const response = await client.expression('["road", "building", "people"]');
    expect(response.content).toEqual(['road', 'building', 'people']);
});

it('describe() answers with a structured content, not a string', async () => {
    const response = await client.describe(MODEL_EMPTY);

    expect(response.type).toBe(MessageTypes.CommandExecutedSuccessfully);
    // This is the crux of the issue: the value is an object, so declaring it a string
    // made every field access a type error.
    expect(typeof response.content).toBe('object');
    const content = response.content as { path: string; species: { name?: string }[] };
    expect(content.path).toBe(MODEL_EMPTY);
    expect(Array.isArray(content.species)).toBe(true);
});
