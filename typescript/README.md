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
