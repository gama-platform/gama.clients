/**
 * Waiting on a websocket, in one place.
 *
 * Listening for a frame, giving up after a timeout and removing the listener afterwards
 * was written out three separate times — for command answers, for arbitrary frames and
 * for the close event — with three different shapes and three different timeouts. Each
 * copy was a chance to leak a listener or to clear the wrong timer.
 */
import { WS_READY_STATE } from "./constants.ts";

/**
 * @param readyState a websocket readyState
 * @returns whether the socket can still carry traffic
 */
export function isUsable(readyState: number): boolean {
    return readyState === WS_READY_STATE.OPEN || readyState === WS_READY_STATE.CONNECTING;
}

/**
 * Opens a websocket, using the browser's implementation when there is one and falling
 * back to the `ws` package under Node.
 * @param url the address to connect to
 * @returns the socket, not yet open
 */
export async function openSocket(url: string): Promise<WebSocket> {
    const WS: typeof WebSocket = typeof globalThis.WebSocket !== "undefined"
        ? globalThis.WebSocket
        : (await import("ws")).default as unknown as typeof WebSocket;
    return new WS(url);
}

/** What to do with each frame: take it and resolve, reject, or keep waiting. */
export type FrameVerdict<T> =
    | { readonly done: true; readonly value: T }
    | { readonly done: false; readonly error?: Error };

/**
 * Waits for a frame the caller accepts, then removes its listener.
 * @param socket the socket to listen on
 * @param inspect called for each frame; returns a verdict, or undefined to keep waiting
 * @param timeoutMs how long to wait before rejecting
 * @param onTimeout builds the rejection thrown when the wait expires
 * @returns the accepted frame's value
 */
export function awaitMessage<T>(
    socket: WebSocket,
    inspect: (event: MessageEvent) => FrameVerdict<T> | undefined,
    timeoutMs: number,
    onTimeout: () => Error
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timer);
            socket.removeEventListener("message", onMessage);
        };
        const timer = setTimeout(() => {
            cleanup();
            reject(onTimeout());
        }, timeoutMs);

        const onMessage = (event: MessageEvent) => {
            const verdict = inspect(event);
            if (verdict === undefined) return;
            cleanup();
            if (verdict.done) {
                resolve(verdict.value);
            } else {
                reject(verdict.error ?? new Error("the awaited message was rejected"));
            }
        };
        socket.addEventListener("message", onMessage);
    });
}

/**
 * Closes a socket and waits for it to actually be closed.
 * @param socket the socket to close
 * @param timeoutMs how long to wait for the close event
 */
export function waitForClose(socket: WebSocket, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
            clearTimeout(timer);
            socket.removeEventListener("close", onClose);
        };
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error("Websocket timed out"));
        }, timeoutMs);

        const onClose = () => {
            cleanup();
            resolve();
        };
        socket.addEventListener("close", onClose);
        socket.close();
    });
}
