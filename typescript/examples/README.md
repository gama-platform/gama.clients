# gama-client browser examples

These are pure-browser demos of [`@gama-platform/gama-client`](../). There is **no
backend and no bundler** — the glue code is plain JavaScript in a
`<script type="module">`, and the library is resolved through an
[import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap).

The import map points at the build in this repository (`../../dist/index.js`), so the
demos exercise the code next to them and break loudly when the API changes. That build
leaves its dependencies external, so `@logtape/logtape` is resolved from a CDN alongside
it.

| Example | What it shows |
| --- | --- |
| [`control-panel/`](./control-panel/) | Connect / load / play / pause / step / reload / evaluate, with a live server-message log. |
| [`mapbox-display/`](./mapbox-display/) | Renders GAMA agents on a Mapbox map via `to_geojson`, using an awaited render loop instead of a 1 ms polling flood. |

## Prerequisites

1. **Build the library**, which is what the import map resolves to:
   ```bash
   cd typescript && npm install && npm run build
   ```
2. **Run a GAMA server** exposing the JSON WebSocket API. The demos default to
   `localhost:6868`, the port the test suite and CI use; both host and port are editable
   in the page.

> To demo against the published package instead of this checkout, point
> `@gama-platform/gama-client` at `https://esm.sh/@gama-platform/gama-client@2` in the
> import map — esm.sh bundles the dependencies, so the `@logtape/logtape` entry can go.

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
