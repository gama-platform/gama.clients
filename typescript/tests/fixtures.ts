/**
 * Shared setup for the integration suites.
 *
 * Every test file used to open with the same `new GamaClient(...) + connectGama()` pair
 * and close with one of three different teardown idioms for the same intent: a loop over
 * recorded experiment ids, a bare `try { stop() } catch {}`, or a state-guarded stop.
 */
import GamaClient from '../src/gama_client.ts';
import type { GamaParameter } from '../src/constants.ts';
import { GAMA_HOST, GAMA_PORT } from './helpers.ts';

/** Options for {@link ClientContext.load}, named rather than positional. */
export interface LoadOptions {
    console?: boolean;
    status?: boolean;
    dialog?: boolean;
    runtime?: boolean;
    parameters?: GamaParameter[];
    until?: string;
}

export interface ClientContext {
    /** The connected client for the current test. */
    readonly client: GamaClient;
    /** Loads an experiment and records its id so teardown can stop it. */
    load(model: string, experiment: string, options?: LoadOptions): Promise<string>;
}

/** @param ms how long to wait @returns a promise resolving after that delay */
export const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Registers the connect/teardown pair for a suite.
 *
 * Call it at describe scope; the returned handle is populated before each test. Anything
 * loaded through `ctx.load` is stopped afterwards, failures ignored, and the connection is
 * always closed.
 * @returns the per-test client and loader
 */
export function useClient(): ClientContext {
    const ctx = {
        client: undefined as unknown as GamaClient,
        async load(model: string, experiment: string, options: LoadOptions = {}): Promise<string> {
            await ctx.client.loadExperiment(
                model, experiment,
                options.console, options.status, options.dialog, options.runtime,
                options.parameters, options.until,
            );
            const id = ctx.client.getExperimentId();
            loaded.push(id);
            return id;
        },
    };
    let loaded: string[] = [];

    beforeEach(async () => {
        loaded = [];
        ctx.client = new GamaClient(GAMA_PORT, GAMA_HOST);
        await ctx.client.connectGama();
    });

    afterEach(async () => {
        for (const id of loaded) {
            try { await ctx.client.stop(id); } catch { /* already gone, or never started */ }
        }
        await ctx.client.closeConnection();
    });

    return ctx;
}
