# Gama client

Gama-client is a Python module designed to facilitate interactions with the headless mode of the modeling and simulation platform known as [gama](https://gama-platform.org/). It is compatible with gama version 1.9.3. This wrapper handles the connection to gama-server and sends properly formatted requests. It is designed to accommodate the asynchronous nature of gama-server, enabling users to manage multiple simulations simultaneously. However, users are responsible for handling received messages, such as command confirmations, simulation outputs, and errors. We provide a functional example that demonstrates how to structure your code for sequential execution.

Starting from version 1.2.0 of the wrapper, a new class has been introduced to allow synchronous (blocking) calls to gama-server. It's important to note that using this feature may lead to issues in cases where errors originate from gama-server, as the code might indefinitely wait for a response that will never arrive.

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

To use `gama-client` you first need to have an instance of [gama-server](https://gama-platform.org/wiki/next/HeadlessServer) open and the python package installed. 
Then you can interact with gama-server in python using the `GamaBaseClient` or `GamaSyncClient` class.

## Available functions
The wrapper supports all the commands described in the gama-server [documentation](https://gama-platform.org/wiki/next/HeadlessServer#available-commands).

## Quick overview

### GamaBaseClient

As previously mentioned, the `GamaBaseClient` class serves as the typical method for engaging with gama-server, and it operates in an asynchronous manner. Consequently, all messages from gama-server are delivered to a function, 
which you must customize to respond according to your program's current state and the content of the received messages.

Before doing anything you will have to create an instance of that class with the `url` and `port` of the running gama-server as well as the function that should be called when a message is received.
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
When running main, your python program should connect to gama-server and when the [ConnectionSuccessful](https://gama-platform.org/wiki/next/HeadlessServer#messages-types) message is sent back to python, the console should show this:
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

### GamaSyncClient

Alternatively you can use the class `GamaSyncClient` to establish the connection. This is recommended for simple scripts as it makes the call of commands
easier, but you may encounter some limitation in case of exceptions raised by gama-server for example.
This class inherits from `GamaBaseClient` and so you can also use it to run async commands if you wish to.

The connection works like this:
```python
import asyncio

from gama_client.sync_client import GamaSyncClient
from typing import Dict

async def async_command_answer_handler(message: Dict):
    print("Here is the answer to an async command: ", message)


async def gama_server_message_handler(message: Dict):
    print("I just received a message from Gama-server and it's not an answer to a command!")
    print("Here it is:", message)

async def main():
    client = GamaSyncClient("localhost", 6868, async_command_answer_handler, gama_server_message_handler)
    await client.connect(False)

    while True:
        await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
```

This time, you have to provide two message handlers, the first one will be used only for answers of asynchronous commands (the same as in `GamaBaseClient`), the second one will be used for all kind of messages that are not answers to commands (synchronous or not), like for example status bar updates, messages writen in the console, some exceptions etc..

The `connect` function works exactly as the `GamaBaseClient` and all the remarks made previously hold for `GamaSyncClient`

### Running commands
Once connected you will want to run commands, the principle is pretty simple: all commands can be from run your `client` variable through functions. For example if you want to run the [load command](https://gama-platform.org/wiki/next/HeadlessServer#the-load-command) you just have to call the `load` function with the proper parameters.
```python
await client.load("path/to/gaml/file", "my_experiment_name")
```


If you are using a `GamaBaseClient`, the program will proceed once the command is dispatched to gama-server. However, it won't pause to await the response, whether it's a success, failure, or the result of an expression you requested for evaluation. You will need to manage the response within the `message_handler` function you established when creating your client.

With a client of type `GamaSyncClient`, you have access to those functions too plus synchronous ones. With synchronous functions the program will stop at each command call and wait for gama-server to answer, then the answer will be passed as the return of the command function. 
Those functions are preceded by the word `sync`. For example the synchronous load functions is called this way:
```python
command_answer = await client.sync_load("path/to/gaml/file", "my_experiment_name")
```
and the variable `command_answer` will contain the result sent by gama-server containing the experiment id.

### Message handling

#### Filtering messages
The messages sent back by gama-server all follow the json format and are converted into a python dictionary by the wrapper. Those messages all have a field called `type` that can help you discriminate between them. The complete list of types and what they correspond to is given in the [documentation](https://gama-platform.org/wiki/next/HeadlessServer#messages-types). And on the python's side you can use the enum `MessageTypes` to test the type of a received message. 
Here is an example of a `message_handler` function that prints a personalised message when a command has been executed successfully:
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

For example here we run 3 identical load commands, and we want to have a special treatment for the second one only, so we give it a special id in the `additional_data` in order to find the corresponding answer in the `message-handler` function:
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
Some working examples are provided in the `examples` directory, you just have to change the values of the variables `server_url`, `server_port`, `gaml_file_path`, `exp_name` and `exp_parameters` to the one corresponding to your own gama-server and experiment to try it.
The example `sequential_example.py` focuses on the use of `GamaBaseClient` while `sync_client_example.py` focuses on `GamaSyncClient`. 
 
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
