**DISCLAIMER: The following documentation is for gama-client 2.0.0 and above. This is a major release containing breaking changes compared to the 1.x versions.**

# Gama client

Gama-client is a Python module designed to facilitate interactions with the headless mode of the modeling and simulation platform known as [GAMA](https://gama-platform.org/). It handles the connection to gama-server via WebSockets and sends properly formatted JSON requests.

While the GAMA server operates asynchronously, `gama-client` provides multiple paradigms to interact with it, ranging from a simple synchronous (blocking) API to a fully asynchronous API for advanced parallelism.

# Installation
In your Python environment, install the `gama-client` package with the following command:

```bash
pip install gama-client
```

You can verify the installation by opening a Python console and running:

```python
from gama_client.sync_client import GamaSyncClient
```

If no errors appear, the installation was successful.

# Usage

## Requirements
To use `gama-client`, you must have an instance of [GAMA Headless Server](https://gama-platform.org/wiki/HeadlessServer) running (e.g., on `localhost:6868`).

---

## 1. Quick Start: Synchronous Mode (Default & Recommended)

The `GamaSyncClient` is the default and simplest way to interact with GAMA. It provides synchronous (blocking) methods for all commands, meaning your Python script will wait for GAMA to finish executing the command before proceeding to the next line. This is ideal for basic model manipulation and sequential scripts.

### Example:

```python
import asyncio
from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


async def main():
    # 1. Initialize and connect the client
    client = GamaSyncClient("localhost", 6868)
    client.connect()

    # 2. Load a model
    print("Loading model...")
    response = client.load("path/to/your/model.gaml", "experiment_name")
    
    # Check if successful and get the experiment ID
    if response["type"] == MessageTypes.CommandExecutedSuccessfully.value:
        exp_id = response["content"]
        print(f"Model loaded. Experiment ID: {exp_id}")
    else:
        print("Failed to load model:", response)
        return

    # 3. Run the simulation for 100 steps
    print("Running 100 steps...")
    client.step(exp_id, nb_step=100)

    # 4. Evaluate an expression (e.g., get the current cycle)
    cycle_response = client.expression(exp_id, "cycle")
    print("Current cycle is:", cycle_response["content"])

    # 5. Change a variable in your simulation
    var_response = client.expression(exp_id, "my_variable <- 42;")
    if var_response["type"] == MessageTypes.CommandExecutedSuccessfully.value:
        print("Variable changed successfully")
    else:
        print("Failed to change variable: " + var_response["content"])

    # 6. Clean up
    client.stop(exp_id)
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 2. Advanced: Asynchronous Execution

### Using Awaitable methods
If your Python application is heavily based on `asyncio` and you do not want to block the main event loop while waiting for GAMA's responses, you can use the `_awaitable` suffix on any command from the `GamaSyncClient` (e.g., `client.load_awaitable(...)`). 

These methods return a coroutine that you must `await`. The major advantage is that you don't need to manually link the request to the response in a global handler (like in pure async mode) — the `await` returns the exact answer for that specific command. Meanwhile, your Python program can do other things in the background while GAMA is computing.

```python
import asyncio

async def do_background_work():
    print("Doing work while GAMA is loading...")
    await asyncio.sleep(1)

async def main():
    client = GamaSyncClient("localhost", 6868)
    client.connect()

    # Launch a GAMA command and a background task concurrently
    gama_task = asyncio.create_task(client.load_awaitable("model.gaml", "exp"))
    other_task = asyncio.create_task(do_background_work())

    # Wait for both
    response, _ = await asyncio.gather(gama_task, other_task)
    print("GAMA answered! Experiment ID:", response["content"])
```

### Pure Asynchronous (Fire-and-forget)
If you want to manage many simulations simultaneously or send commands without pausing for responses, you should use the pure asynchronous paradigm. 

Every command is available with an `_async` suffix (e.g., `load_async()`, `step_async()`). When called, the command is dispatched immediately, and your script moves to the next line. To catch the responses, simulation outputs, or errors, you must provide a `message_handler` function.

**Did you know? You can mix modes!**
The `GamaSyncClient` inherits all `_async` methods. This means you can comfortably mix blocking synchronous commands (like `load` to set up a model sequentially) with pure asynchronous commands (like `step_async` to run multiple simulations in parallel) using the same client. To do this, simply provide your handlers during the initialization of the `GamaSyncClient` as shown below.

```python
import asyncio
from gama_client.sync_client import GamaSyncClient

async def async_command_answer_handler(message):
    print("Answer to an _async command received:", message)

async def gama_server_message_handler(message):
    print("General message (outputs, errors) received:", message)

async def main():
    client = GamaSyncClient("localhost", 6868, async_command_answer_handler, gama_server_message_handler)
    client.connect()

    # Synchronous loading (easy and safe)
    res = client.load("path/to/model.gaml", "exp")
    
    # Asynchronous step (fire and forget, answer goes to async_command_answer_handler)
    await client.step_async(res["content"], nb_step=100)

    # Keep program alive to receive the asynchronous messages
    await asyncio.sleep(5)
    client.close_connection()
```

*(Note: If you only plan to use pure asynchronous commands and want absolute maximum performance, you can use the `GamaAsyncClient` class directly. It strips away the tracking overhead required by the `GamaSyncClient`.)*

### Retrieving an `_async` command's answer
Because all asynchronous responses go to the global `message_handler`, tracking which answer corresponds to which command can be difficult. 

To solve this, every `_async` command accepts an `additional_data` dictionary parameter. Any data you pass here will be echoed back by GAMA in the response. You can use this to pass unique IDs (like `uuid` or a counter) to route answers correctly in your handler.

---

## Timeout Management

By default, synchronous and awaitable commands have no timeout. To prevent your script from hanging indefinitely if the GAMA server encounters an error or takes too long, you can set a one in two different ways:

- **`GamaSyncClient` Initialization**: You can define a `default_timeout` (in seconds) when instantiating the client. This will apply to all the synchronous and awaitable commands run by this client.
- **Per-Command Timeout**: Every synchronous and awaitable method accepts a `timeout` parameter to override the default for that specific call.

```python
# Timeout after 60 seconds
response = client.load("model.gaml", "exp", timeout=60.0) 
```

If the timeout is reached, an `asyncio.TimeoutError` is raised.

---

## Breaking Changes in 2.0.0

Version 2.0.0 is a major overhaul of the API aimed at standardizing how commands are sent and awaited, and making the synchronous mode more robust.

**Major API Changes:**
1. **`GamaBaseClient` renamed to `GamaAsyncClient`**: The class providing the pure asynchronous (fire-and-forget) implementation has been renamed for clarity.
2. **Method suffixing in `GamaAsyncClient`**: All command methods in the async client have been suffixed with `_async` (e.g., `load()` is now `load_async()`, `step()` is `step_async()`).
3. **Synchronous methods are now the default names**: In `GamaSyncClient`, the clean method names (e.g., `load()`, `step()`) now refer to the fully synchronous, blocking versions. (Previously, these names were used for the async versions inherited from the base client).
4. **`_awaitable` methods introduced**: `GamaSyncClient` now provides `_awaitable` versions for all commands (e.g., `load_awaitable()`) for users who want to await the server's response in an `async` loop without blocking the entire thread.

**New Features & Fixes:**
- **Timeouts**: All synchronous and awaitable commands now support a `timeout` parameter (and the client accepts a `default_timeout` upon initialization) to prevent the program from hanging indefinitely if GAMA Server fails to respond. This resolves major hanging issues encountered in previous versions.
- **Full Parity**: Missing commands like `ask`, `upload`, `download`, and `exit` have been fully implemented across all three modes (`async`, `awaitable`, `sync`).
- **Unified Test Suite**: Complete refactoring of the test suites, ensuring identical coverage and behavior validation for all three API modes.

---

## Example Code

Working examples can be found in the `examples` directory of the repository. You simply need to adjust the variables (`server_url`, `gaml_file_path`, etc.) to match your local setup.

- The `sync_examples` directory focuses on the recommended `GamaSyncClient`.
- The `async_examples` directory demonstrates the pure `GamaAsyncClient` usage.

---

# To generate a new release (for contributors only)

## Using github action

There is a github action: `.github/workflows/python-publish.yml` that automatically builds and uploads the new files to pypi. 

## Manually the new files to pypi
For reference: this documentation is based on this [tutorial](https://packaging.python.org/en/latest/tutorials/packaging-projects/#generating-distribution-archives). Please check it out for more details about tools to install and/or context.

* increment the version number in `pyproject.toml`
* commit your changes to github
* make sure you installed the required tools by running
```bash
python -m pip install --upgrade build twine
```
* in the project's folder, to build the library, run
```bash
python -m build
```
* then, to upload the generated files, run
```bash
python -m twine upload --repository pypi dist/*
```
* on github, go to releases
* click on create a new release
* in tag, create a new tag with the new release number
* add a description of the changes
* in binaries, upload the two `.whl` and `.tar.gz` files generated by the `build` command
* click on `publish release`
