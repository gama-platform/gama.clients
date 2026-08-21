/**
 * Package entry point.
 *
 * `GamaClient` is exported both as the default and by name, so the historical
 * `import GamaClient from '@gama-platform/gama-client'` keeps working unchanged.
 * The types travel with it: before this existed they were declared in constants.ts
 * and unreachable for consumers, who had to redeclare `GamaMessage` by hand.
 */
export { default, default as GamaClient } from './gama_client.ts';

export type {
    ExperimentState,
    GamaMessage,
    GamaParameter,
    GamaState,
} from './constants.ts';

export {
    AGENT_REFERENCE_PATTERN,
    GAMA_ERROR_MESSAGES,
    MessageTypes,
    WS_READY_STATE,
} from './constants.ts';
