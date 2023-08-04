# Gama client
 Gama-client is a python wrapper for interacting with the headless mode (called gama-server) of the modeling and simulation platform [gama](https://gama-platform.org/). The latest release is compatible with gama 1.9.2.
This wrapper will take care of the connection with gama-server and of sending properly formatted requests to gama-server. It is made to fit the asynchronous nature of gama-server and thus makes it possible to handle multiple simulations at the same time, but the counterpart is that the users will still have to manage what to do with the received messages (command confirmation, simulation output, errors etc.) by themselves. We provide a working example that shows the architecture you can deploy if you still want to have a sequential execution.

# Installation
In your python environment, install the gama-client package with the command:

```
pip install gama-client
```

For advanced users, you can find the package on the [pypi website](https://pypi.org/project/gama-client/) and do it yourself instead of using the `pip` tool.

You can check that everything went well by opening a python console and try the following line:

```python
from gama_client.base_client import GamaBaseClient
```

If you don't see any error message then `gama-client` has been installed correctly.


# Using it

## Requirements

To use `gama-client` you first need to have an instance of [gama-server](https://gama-platform.org/wiki/next/HeadlessServer) open and the python package installed. Then you can interact with gama-server in python using the `GamaBaseClient` class.

## Available functions
The wrapper supports all the commands described in the gama-server [documentation](https://gama-platform.org/wiki/next/HeadlessServer#available-commands).

## Quick overview

As explained before, everything goes through the `GamaBaseClient` class.

Before doing anything you will have to create an instance of that class with the `url` and `port` where your gama-server is running as well as the function that should be called when a message is received.
for example to connect to a local gama-server running on port 6868 and printing received message:
```python
import asyncio

from gama_client.base_client import GamaBaseClient
async def message_handler(message):
    print("received message:", message)


async def main():
    client = GamaBaseClient("localhost", 6868, message_handler)
    await client.connect(False)

    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
```
When running main, your python program should connect to gama-server and when the [ConnectionSuccessful](https://gama-platform.org/wiki/next/HeadlessServer#messages-types) message is sent back to python, the console should show
```yaml
received message: {'type': 'ConnectionSuccessful', 'content': '480777042'}
```
**Note:** make sure to define your `message_handler` as an **async** function, as it's what's expected by `GamaBaseClient`.

As explained in the gama-server documentation [here](https://gama-platform.org/wiki/next/HeadlessServer#connection) and [there](https://gama-platform.org/wiki/next/HeadlessServer#connection-related-answers) you should then use the `content` value (here '480777042') as a **socket id** in the rest of your interactions with gama-server. 
The class `GamaBaseClient` contains a variable `socket_id` that you can use to store the socket id of your client, or for more simplicity you can connect with:
```python
await client.connect(True)
```
or
```python
await client.connect()
```
And the client will take care of handling this first message and setting the `socket_id` by itself.

To explicitly disconnect from gama-server, simply use the `close_connection` function:
```python
await client.close_connection()
```
you can later reconnect with the same `client` object the same way you did the first time, with the `connect` function.

### Running commands
Once connected you will want to run commands, the principle is pretty simple: all commands can be run your `client` variable through functions. For example if you want to run the [load command](https://gama-platform.org/wiki/next/HeadlessServer#the-load-command) you just have to call the `load` function with the proper parameters.
```python
await client.load("path/to/gaml/file", "my_experiment_name")
```

### Message handling

#### Filtering messages
The messages sent back by gama-server all follow the json format and are converted into a python dictionary by the wrapper. Those messages all have a field called `type` that can help you discriminate between them. The complete list of types and what they correspond to is given in the [documentation](https://gama-platform.org/wiki/next/HeadlessServer#messages-types). And on the python's side you can use the enum `MessageTypes` to test the type of a received message. 
Here is an example of a `message_handler` function that prints a personnalised message when a command has been executed successfully:
```python
async def message_handler(message):
    if "type" in message.keys() and message['type'] == MessageTypes.CommandExecutedSuccessfully.value:
        print("congratulation, a command was executed successfully !")
    else:
        print("other kind of message", message)
```
**Notes:** 
 * If you use the `MessageTypes` enum, don't forget to use the `value` attribute to compare it to strings
 * As explained before, `message_handler` **must** be `async` even if you don't use `await` inside
 
#### Retrieving a command's answer

If you run your client purely asynchronous and have multiple simulations running at the same time, you will encounter the problem of retrieving which message corresponds to which command/simulation.

For the simulation outputs or errors, they simply include an `experiment_id` field that will tell you exactly to which experiment the message corresponds to.
Answers to commands include a `command` field, containing the entirety of the command it responds to. 

In every command function, there is an optional parameter called `additional_data`, you can use it to store metadata about your command, for example an id, and use it to find to which precise command does an answer responds to because those additional data will also be stored in the `command` field of the answer.

For example here we run 3 identical load commands, and we want to have a special treatment for the second one only, so we give it a special id in the `additional-data` in order to find the corresponding answer in the `message-handler` function:
```python
import asyncio
from typing import Dict

from gama_client.base_client import GamaBaseClient

load_command_secret_id = 123
other_id = 1


async def message_handler(message: Dict):
    if "command" in message.keys() and "my_secret_id" in message['command'] and message['command']["my_secret_id"] == load_command_secret_id:
        print("answer for the load command we wanted to retrieve received:", message)
    else:
        print("other kind of message", message)

async def main():
    client = GamaBaseClient("localhost", 6868, message_handler)
    await client.connect()

    gaml_file = "path/to/gaml/file"
    expriment = "name of the experiment"
    # this is not the command we want to retrieve
    await client.load(gaml_file, expriment, additional_data={"my_secret_id": other_id})

    # this is the command we want to retrieve the answer to
    await client.load(gaml_file, expriment, additional_data={"my_secret_id": load_command_secret_id})

    # this is not the command we want to retrieve
    await client.load(gaml_file, expriment, additional_data={"my_secret_id": other_id})

    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())

```


## Example code
A complete working example is given in the `examples` directory, you just have to change the values of the variables `MY_SERVER_URL`, `MY_SERVER_PORT`, `GAML_FILE_PATH_ON_SERVER`, `EXPERIMENT_NAME` and `MY_EXP_INIT_PARAMETERS` to the one corresponding to your own gama-server and experiment to try it.
 
 
# To generate a new release (for contributors only)
## Upload the new files to pypi
For reference: this documentation is based on this [tutorial](https://packaging.python.org/en/latest/tutorials/packaging-projects/#generating-distribution-archives). Please check it out for more details about tools to install and/or context.

* increment the version number in `pyproject.toml`
* commit your changes to github
* make sure you installed the required tools by running
```
python -m pip install --upgrade build
```
```
python -m pip install --upgrade twine
```
* in the project's folder, to build the library, run
```
python -m build
```
* then, to upload the generated files, run
```
python -m twine upload --repository pypi dist/*
```
* on github, go to releases
* click on create a new release
* in tag, create a new tag with the new release number
* add a description of the changes
* in binaries, upload the two .whl files generated by the `build` command
* click on `publish release`
