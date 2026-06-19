# gama-client browser examples

These are pure-browser demos of [`@gama-platform/gama-client`](../). There is **no
backend, bundler, install or build step** — the glue code is plain JavaScript in a
`<script type="module">`, and the library is pulled straight from the npm registry through
the [esm.sh](https://esm.sh) CDN via an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
(esm.sh bundles its dependencies for you).

They replace the old hand-written demos in `js_static/` with the modern library:

| Example | Replaces | What it shows |
| --- | --- | --- |
| [`control-panel/`](./control-panel/) | `js_static/example/syntax.html` | Connect / load / play / pause / step / reload / evaluate, with a live server-message log. |
| [`mapbox-display/`](./mapbox-display/) | `js_static/example/display.html` | Renders GAMA agents on a Mapbox map via `to_geojson`, using an awaited render loop instead of the original 1 ms polling flood. |

## Prerequisites

**Run a GAMA server** exposing the JSON WebSocket API (default `localhost:1000`). That's it
— the library itself is loaded from the CDN, so nothing needs to be installed or built.

> Want to test a local, unpublished build of the library instead of the npm version?
> Run `npm run build` in `typescript/` and change the import map in each `index.html` to
> point `@gama-platform/gama-client` at `../../dist/gama_client.js` (and add a
> `"@logtape/logtape": "https://esm.sh/@logtape/logtape@2"` entry so its dependency resolves).

## Running

Browsers refuse ES-module / import-map loading over `file://`, so serve this folder
with any static file server, then open the page:

```bash
# from the typescript/ folder
npx serve examples        # or: python3 -m http.server --directory examples 8080
```

Then visit <http://localhost:3000> (or whatever port your server prints) and pick a demo.

## Notes

- **Control panel** — the model path, experiment name, parameters and end condition are
  all editable in the UI. The defaults target the Road Traffic tutorial model; change the
  model path to an absolute path that exists on the GAMA server's machine.
- **Mapbox display** — enter your own
  [Mapbox access token](https://account.mapbox.com/access-tokens/) in the UI (it is saved in
  the browser's `localStorage`, never committed to source). The model path is editable in the
  UI too; the remaining configuration (experiment, species) is at the top of the inline
  `<script type="module">`. It targets the `Plan_des_pistes.gaml` model with
  `people` / `building` species.
