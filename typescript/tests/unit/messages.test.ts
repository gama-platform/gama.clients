/**
 * Unit tests for the pure protocol helpers.
 *
 * These need no gama-server and run in milliseconds. Everything they cover used to be
 * buried inside GamaClient, so the only way to test it was to boot a server, load a model
 * and drive a real command — the agent-reference checks in the ask suite still do exactly
 * that to assert six strings fail a regex.
 */
import {
    answersCommand, buildPayload, errorContentToString, isAgentReference,
    isErrorMessage, normaliseAskArgs, parseMessage,
} from '../../src/messages.ts';
import { CLIENT_COMMAND_ID, MessageTypes } from '../../src/constants.ts';
import type { GamaMessage } from '../../src/constants.ts';

describe('parseMessage', () => {
    it('parses a JSON frame', () => {
        expect(parseMessage('{"type":"X","content":1}')).toEqual({ type: 'X', content: 1 });
    });

    it.each(['not json', '', '{unclosed', undefined])('returns undefined for %p', (frame) => {
        expect(parseMessage(frame)).toBeUndefined();
    });
});

describe('isErrorMessage', () => {
    it.each([
        MessageTypes.GamaServerError,
        MessageTypes.UnableToExecuteRequest,
        MessageTypes.MalformedRequest,
        MessageTypes.RuntimeError,
    ])('treats %s as a failure', (type) => {
        expect(isErrorMessage(type)).toBe(true);
    });

    it.each([MessageTypes.CommandExecutedSuccessfully, MessageTypes.SimulationStatus])(
        'treats %s as a result', (type) => {
            expect(isErrorMessage(type)).toBe(false);
        });
});

describe('errorContentToString', () => {
    it('passes a string through untouched', () => {
        expect(errorContentToString('boom')).toBe('boom');
    });

    it('serialises a structured content', () => {
        expect(errorContentToString({ exception: 'X' })).toBe('{"exception":"X"}');
    });

    it('renders an absent content as the empty string', () => {
        expect(errorContentToString(undefined)).toBe('""');
    });
});

// ─── the #27 correlation predicate ───────────────────────────────────────────

describe('answersCommand', () => {
    const withId = (id: string): GamaMessage =>
        ({ type: 'CommandExecutedSuccessfully', command: { [CLIENT_COMMAND_ID]: id } });

    it('accepts the answer carrying its own id', () => {
        expect(answersCommand(withId('ts-client-1'), 'ts-client-1')).toBe(true);
    });

    it('refuses an answer belonging to another command', () => {
        // The abandoned answer of a timed-out command, or one of the extra frames
        // gama-server emits alongside an error. Consuming it leaves every later
        // command one answer behind.
        expect(answersCommand(withId('ts-client-1'), 'ts-client-2')).toBe(false);
    });

    it('accepts an answer with no echo at all', () => {
        // Notifications and unparseable commands carry no `command`, so they keep the
        // historical type-only matching rather than being dropped.
        expect(answersCommand({ type: 'SimulationStatus' }, 'ts-client-2')).toBe(true);
    });

    it('accepts anything when no command is being awaited', () => {
        expect(answersCommand(withId('ts-client-9'))).toBe(true);
    });
});

describe('buildPayload', () => {
    it('keeps the fields that are defined', () => {
        expect(buildPayload({ type: 'step' }, { sync: true, nb_step: 3 }))
            .toEqual({ type: 'step', sync: true, nb_step: 3 });
    });

    it('omits undefined optionals rather than serialising them', () => {
        // gama-server distinguishes an absent key from a present one: `ask` reaches the
        // experiment agent only when `agent` is missing entirely.
        expect(buildPayload({ type: 'ask' }, { agent: undefined })).toEqual({ type: 'ask' });
        expect('agent' in buildPayload({ type: 'ask' }, { agent: undefined })).toBe(false);
    });

    it('keeps falsy-but-defined values', () => {
        expect(buildPayload({ type: 'step' }, { sync: false })).toEqual({ type: 'step', sync: false });
    });
});

// ─── the #25 agent reference and args rules ──────────────────────────────────

describe('isAgentReference', () => {
    it.each(['simulation[0]', 'simulation[0].people[42]', 'simulation[1].people[0].cell[3]'])(
        'accepts %p', (ref) => expect(isAgentReference(ref)).toBe(true));

    it.each(['world', 'people', 'simulation', '', 'simulation[0].', 'simulation[a]', 'simulation[0]people[1]'])(
        'rejects %p', (ref) => expect(isAgentReference(ref)).toBe(false));
});

describe('normaliseAskArgs', () => {
    it('serialises an object', () => {
        expect(normaliseAskArgs({ nb: 5 })).toBe('{"nb":5}');
    });

    it('passes a JSON object string through', () => {
        expect(normaliseAskArgs('{"nb": 5}')).toBe('{"nb": 5}');
    });

    it('rejects a JSON array', () => {
        // gama-server answers CommandExecutedSuccessfully for "[]" while silently
        // dropping every argument, so the failure would otherwise be invisible.
        expect(() => normaliseAskArgs('[]')).toThrow(/must be a JSON object/);
    });

    it.each(['not json', 'null', '42', '"a string"'])('rejects %p', (args) => {
        expect(() => normaliseAskArgs(args)).toThrow(/must be a JSON object/);
    });
});
