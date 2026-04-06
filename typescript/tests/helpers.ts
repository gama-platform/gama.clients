import path from 'path';
import type { GamaMessage } from '../src/constants.ts';

/**
 * Absolute path to the shared GAML test models.
 * process.cwd() is the typescript/ directory when running `npm test`.
 */
export const GAML_DIR = path.resolve(process.cwd(), '../tests/gaml');

export const MODEL_EMPTY         = path.join(GAML_DIR, 'empty.gaml');
export const MODEL_BATCH         = path.join(GAML_DIR, 'empty_batch.gaml');
export const MODEL_TEST          = path.join(GAML_DIR, 'empty_test.gaml');
export const MODEL_CONSOLE       = path.join(GAML_DIR, 'console_message.gaml');
export const MODEL_TO_IMPORT     = path.join(GAML_DIR, 'to_import.gaml');
export const MODEL_IMPORTING     = path.join(GAML_DIR, 'importing.gaml');
export const MODEL_FAULTY        = path.join(GAML_DIR, 'faulty.gaml');
export const MODEL_WITH_PARAMS   = path.join(GAML_DIR, 'experiment_with_params.gaml');
export const MODEL_INIT_ERROR    = path.join(GAML_DIR, 'init_error.gaml');
export const MODEL_RUNTIME_ERROR = path.join(GAML_DIR, 'runtime_error.gaml');

export const GAMA_PORT = parseInt(process.env.GAMA_PORT ?? '6868');
export const GAMA_HOST = process.env.GAMA_HOST ?? 'localhost';

/**
 * success() resolves with a GamaMessage object even though it is typed as string.
 * This helper casts it so tests can inspect type and content.
 */
export function asMsg(response: string): GamaMessage {
    return response as unknown as GamaMessage;
}
