/**
 * Pure helpers for the frames exchanged with gama-server.
 *
 * Nothing here touches a socket, which is deliberate: this is the subtle half of the
 * protocol — which answer belongs to which command, what counts as an error, how `args`
 * has to be shaped — and keeping it free of I/O makes it testable without a running
 * gama-server.
 */
import type { GamaMessage } from "./constants.ts";
import { AGENT_REFERENCE_PATTERN, CLIENT_COMMAND_ID, GAMA_ERROR_MESSAGES } from "./constants.ts";

/**
 * Parses a frame received on the websocket.
 * @param data the raw frame
 * @returns the parsed message, or undefined when the frame is not JSON
 */
export function parseMessage(data: unknown): GamaMessage | undefined {
    try {
        return JSON.parse(data as string) as GamaMessage;
    } catch {
        return undefined;
    }
}

/**
 * @param type a message type sent by gama-server
 * @returns whether it reports a failure rather than a result
 */
export function isErrorMessage(type: string): boolean {
    return (GAMA_ERROR_MESSAGES as readonly string[]).includes(type);
}

/**
 * `content` is whatever the command returned, so it is not necessarily a string.
 * @param content the content of an error message
 * @returns it rendered for `getContentError()`
 */
export function errorContentToString(content: unknown): string {
    return typeof content === "string" ? content : JSON.stringify(content ?? "");
}

/**
 * Decides whether an answer belongs to the command that is waiting for it.
 *
 * gama-server echoes the command it answers, custom fields included, so an answer
 * carrying a *different* id belongs to somebody else: a command whose caller already
 * timed out, or one of the extra frames the server emits alongside an error. Consuming
 * those is what used to leave the client one answer behind for good. Answers with no
 * echo at all — notifications, commands the server could not parse — keep the historical
 * type-only matching.
 * @param message the answer received
 * @param commandId the id of the command being awaited, if any
 * @returns whether the answer may be taken
 */
export function answersCommand(message: GamaMessage, commandId?: string): boolean {
    if (commandId === undefined) return true;
    const echoedId = message.command?.[CLIENT_COMMAND_ID];
    return echoedId === undefined || echoedId === commandId;
}

/**
 * Assembles a command payload, leaving out the optional fields that were not given.
 * gama-server distinguishes an absent key from a present one — `ask` reaches the
 * experiment agent only when `agent` is missing entirely — so an explicit `undefined`
 * must not be serialised.
 * @param base the fields the command always carries
 * @param optional the fields to include only when defined
 * @returns the payload to send
 */
export function buildPayload(
    base: Record<string, unknown>,
    optional: Record<string, unknown> = {}
): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(optional)) {
        if (value !== undefined) payload[key] = value;
    }
    return payload;
}

/**
 * @param agent an agent reference as accepted by gama-server
 * @returns whether it is shaped as `species[index]` segments separated by dots
 */
export function isAgentReference(agent: string): boolean {
    return AGENT_REFERENCE_PATTERN.test(agent);
}

/**
 * Normalises the `args` parameter of `ask` into the JSON object string gama-server
 * expects. The server reads `args` as a raw string and parses it itself, so an object is
 * stringified here and a string is checked to be a JSON object: a JSON array such as
 * `"[]"` is accepted by the server but silently produces no argument at all.
 * @param args arguments of the action, as an object or as a JSON object string
 * @returns the arguments as a JSON object string
 */
export function normaliseAskArgs(args: string | Record<string, unknown>): string {
    if (typeof args !== "string") return JSON.stringify(args);

    let parsed: unknown;
    try {
        parsed = JSON.parse(args);
    } catch {
        throw new Error(`ask(): 'args' must be a JSON object (for example "{}"), received the non-JSON string ${JSON.stringify(args)}`);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(`ask(): 'args' must be a JSON object (for example "{}"), received ${JSON.stringify(args)}`);
    }
    return args;
}
