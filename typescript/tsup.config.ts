import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/gama_client.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2020',
});
