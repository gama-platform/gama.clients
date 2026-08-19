# Official typescript Gama library

This library provides a convenient way to interact with the gama server, and enables you to manage running experiments easily through websockets.


## Instructions

Install the dependencies of this library by running npm install
note: jest is not required for using the library, but it is needed tu run the test file.
to run the tests, use npm run test

The tests talk to a real gama-server. Start one first — `gama-headless.sh -socket 6868`
— or point the suite elsewhere with the `GAMA_PORT` and `GAMA_HOST` environment
variables. The GAML models they load live in `../tests/gaml`, shared with the python
client.

## Usage

All functions are documented using JSDoc comments. 

### Reading a command's answer

Every command resolves with the message gama-server sent back:

```ts
const response = await client.expression("length(people)");
response.type;     // "CommandExecutedSuccessfully"
response.content;  // the value — a number here
response.command;  // the command this answers, echoed by the server
```

`content` is typed `unknown` because its shape follows the command: a string for `load`,
a number or a list for `expression`, a nested object for `describe`. Narrow it at the
call site.

### Calling an action with `ask`

`agent` is an *agent reference*, not a species or variable name: `species[index]`
segments separated by dots, starting at the simulation.

```ts
// an action declared in `global`
await client.ask("myAction", { nb: 5 }, "simulation[0]");
// an action declared in a species
await client.ask("myAction", {}, "simulation[0].people[42]");
```

`"world"` is not a valid reference. Omitting `agent` targets the *experiment* agent,
which does not hold the actions declared in `global`.

Note that gama-server does not send an action's return value back — the answer's content
is always empty. To read a value out of the simulation, use `expression`:

```ts
const { content } = await client.expression("simulation.getStaticSpecies()");
```

### Closing down from a browser

Browsers do not keep a page alive for async `beforeunload` handlers, so an awaited
cleanup is cut short and the page reloads while the previous session is still shutting
down. `disposeSync` sends the stop and closes the socket synchronously:

```ts
window.addEventListener("beforeunload", () => client.disposeSync());
```

Use `await client.stop()` followed by `await client.closeConnection()` anywhere you can
actually await them — `disposeSync` returns without any confirmation from the server.
