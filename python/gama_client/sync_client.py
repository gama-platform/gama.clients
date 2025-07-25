import json
import asyncio
from asyncio import Future
from typing import Dict, Callable, Awaitable, Any, List
import nest_asyncio

from gama_client.command_types import CommandTypes
from gama_client.async_client import GamaAsyncClient
import uuid

# Mandatory to handle nested asyncio calls
nest_asyncio.apply()


class GamaSyncClient(GamaAsyncClient):
    # CLASS VARIABLES
    futures: Dict[str, Future] = {}
    unregistered_command_handler: Callable[[Dict], Awaitable]
    other_message_handler: Callable[[Dict], Awaitable]
    default_timeout: float

    @staticmethod
    async def default_unregistered_command_handler(self, message: Dict):
        raise Exception("cannot retrieve the command for which this message is an answer, message must contain an "
                        "'api_id' field: " + str(message))

    @staticmethod
    async def default_other_message_handler(message: Dict):
        print("message received from server: ", str(message))

    async def sync_message_handler(self, message: Dict):
        if "command" in message:
            if "api_id" in message["command"]:
                api_id = message["command"]["api_id"]
                if api_id in self.futures:
                    self.futures[api_id].set_result(message)
                # If no future found, it may have timed out already - ignore silently
            else:
                await self.unregistered_command_handler(message)
        else:
            await self.other_message_handler(message)

    def __init__(self, url: str, port: int,
                 async_command_handler: Callable[[Dict], Awaitable] = default_unregistered_command_handler,
                 other_message_handler: Callable[[Dict], Awaitable] = default_other_message_handler,
                 default_timeout: float = None):
        """
        Initialize the client. At this point no connection is made yet.

        :param other_message_handler: A function that will handle messages that are not results of commands (calls
            to write, status-bar update, general gama-server exception etc.). If left by default, will print the message
            in the console.
        :param async_command_handler: a function that will handle commands run asynchronously. If left by default,
            it will raise an exception.
        :param url: A string representing the url (or ip address) where the gama-server is running
        :param port: An integer representing the port on which the server runs
        :param default_timeout: Default timeout in seconds for all commands. None means no timeout.
        """
        super().__init__(url, port, self.sync_message_handler)
        self.other_message_handler = other_message_handler
        self.unregistered_command_handler = async_command_handler
        self.default_timeout = default_timeout


    async def execute_cmd_awaitable(self, cmd: Dict[str, Any], timeout: float = None) -> Dict[str, Any]:
        """
            For internal use only. Generates a unique command id, creates a linked future, adds the id to the command, sends the command to the server
            with a possible timeout, waits for the answer from the server and returns it.

        :param cmd: the command to execute
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: the answer to the command sent by gama-server
        """
        command_id: str = str(uuid.uuid1())

        # we add an entry in the command to be able to find it back in the answer messages
        cmd["api_id"] = command_id
        self.futures[command_id] = self.event_loop.create_future()
        
        # actually send the command
        await self.socket.send(json.dumps(cmd))
        
        # Use the provided timeout, or fall back to default_timeout
        actual_timeout = timeout if timeout is not None else self.default_timeout
        
        if actual_timeout is None or actual_timeout <= 0:
            # No timeout
            return await self.futures[command_id]
        else:
            # Apply timeout
            try:
                return await asyncio.wait_for(self.futures[command_id], timeout=actual_timeout)
            except asyncio.TimeoutError:
                # Clean up the future to prevent memory leaks
                if command_id in self.futures:
                    del self.futures[command_id]
                raise asyncio.TimeoutError(f"Command timed out after {actual_timeout} seconds")
            except Exception as e:
                print(e)
                # Clean up the future on any exception
                if command_id in self.futures:
                    del self.futures[command_id]
                raise


    def connect_awaitable(self, set_socket_id: bool = True, ping_interval: Dict[Any, float] = 20, timeout: float = None) -> Dict[str, Any]:
        """
        Tries to connect the client to gama-server using the url and port given at the initialization.
        Once the connection is done it runs **start_listening_loop** and sets **socket_id** if **set_socket_id**
        is True.

        :param set_socket_id: If True, the listening loop will filter out the messages of type ConnectionSuccessful
            and the GamaClient will set its socket_id itself. If set to false, the users will have to set the client's
            socket_id field themselves in the message_handler function
        :param ping_interval: The interval between each
            ping send to keepalive the connection, use None to deactivate this behaviour
        :param ping_timeout: The time the client is waiting for an answer to the ping sent before declaring that the connection is lost (part of
            the keepalive loop)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :returns: Returns either once the listening loop starts if set_socket_id is False or when
            a socket_id is sent by gama-server
        :raise Exception: Can throw exceptions in case of connection problems.
        """
                
        return self.event_loop.run_until_complete(self.connect_async(set_socket_id, ping_interval, timeout))

    def connect(self, set_socket_id: bool = True, ping_interval: Dict[Any, float] = 20,
                ping_timeout: float = 20, timeout: float = None) -> None:
        """
        Tries to connect the client to gama-server using the url and port given at the initialization.
        Once the connection is done it runs **start_listening_loop** and sets **socket_id** if **set_socket_id**
        is True.

        :param set_socket_id: If True, the listening loop will filter out the messages of type ConnectionSuccessful
            and the GamaClient will set its socket_id itself. If set to false, the users will have to set the client's
            socket_id field themselves in the message_handler function
        :param ping_interval: The interval between each
            ping send to keepalive the connection, use None to deactivate this behaviour
        :param ping_timeout: The time the client is waiting for an answer to the ping sent before declaring that the connection is lost (part of
            the keepalive loop)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :returns: Returns either once the listening loop starts if set_socket_id is False or when
            a socket_id is sent by gama-server
        :raise Exception: Can throw exceptions in case of connection problems.
        """
        self.event_loop.run_until_complete(self.connect_awaitable(set_socket_id, ping_interval, ping_timeout, timeout))

    async def load_awaitable(self, file_path: str, experiment_name: str, console: bool = None, status: bool = None,
                             dialog: bool = None, runtime: bool = None, parameters: List[Dict] = None, until: str = "",
                             socket_id: str = "",
                             additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """Sends a command to load the experiment **experiment_name** from the file **file_path** (on the server side).

        **Note**
            The parameters must follow this format: ::

                {
                    "type": "<type of the parameter>",
                    "value": "<value of the parameter>",
                    "name": "<name of the parameter in the gaml file>"
                }

            Example value of parameters: ``[{"type": "float", "value": "0.75", "name": "conversion_rate"}]``

        :param file_path: The path of the file containing the experiment to run
        :param experiment_name: The name of the experiment to run
        :param socket_id: The socket that will be linked to the experiment, if empty uses current connection
        :param console: True if you want gama-server to redirect the simulation's console outputs
        :param status: True if you want gama-server to redirect the simulation's status changes
        :param dialog: True if you want gama-server to redirect the simulation's dialogs
        :param runtime: True if you want gama-server to redirect the simulation's runtime errors
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment
            parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :returns: If everything goes well on the server side, gama-server will send back a message containing the
            experiment's id.
        """
        cmd = {
            "type": CommandTypes.Load.value,
            "model": file_path,
            "experiment": experiment_name,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if console is not None:
            cmd["console"] = console
        if status is not None:
            cmd["status"] = status
        if dialog is not None:
            cmd["dialog"] = dialog
        if runtime is not None:
            cmd["runtime"] = runtime
        if parameters:
            cmd["parameters"] = parameters
        if until and until != '':
            cmd["until"] = until
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def load(self, file_path: str, experiment_name: str, console: bool = None, status: bool = None,
             dialog: bool = None, runtime: bool = None, parameters: List[Dict] = None, until: str = "",
             socket_id: str = "",
             additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """Sends a command to load the experiment **experiment_name** from the file **file_path** (on the server side).

        **Note**
            The parameters must follow this format: ::

                {
                    "type": "<type of the parameter>",
                    "value": "<value of the parameter>",
                    "name": "<name of the parameter in the gaml file>"
                }

            Example value of parameters: ``[{"type": "float", "value": "0.75", "name": "conversion_rate"}]``

        :param file_path: The path of the file containing the experiment to run
        :param experiment_name: The name of the experiment to run
        :param socket_id: The socket that will be linked to the experiment, if empty uses current connection
        :param console: True if you want gama-server to redirect the simulation's console outputs
        :param status: True if you want gama-server to redirect the simulation's status changes
        :param dialog: True if you want gama-server to redirect the simulation's dialogs
        :param runtime: True if you want gama-server to redirect the simulation's runtime errors
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment
            parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :returns: If everything goes well on the server side, gama-server will send back a message containing the
            experiment's id.
        """

        return self.event_loop.run_until_complete(self.load_awaitable(file_path, experiment_name, console, status,
                                                                      dialog, runtime, parameters, until,
                                                                      socket_id, additional_data, timeout))

    def exit(self):
        """
        Sends a command to kill the gama-server
        """
        return self.event_loop.run_until_complete(self.exit_async())

    async def validate_awaitable(self, expressions: str, syntax: bool, escaped: bool, additional_data: Dict = None, timeout: float = None) \
            -> Dict[str, Any]:
        """
        Sends a command to check some gaml expressions validity.

        :param expressions: The code to check
        :param syntax: True to only check the syntax
        :param escaped: True if the expressions are escaped already
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Validate.value,
            "expr": expressions,
            "syntax": syntax,
            "escaped": escaped
        }
        if additional_data:
            cmd.update(additional_data)
        return await self.execute_cmd_awaitable(cmd, timeout)

    def validate(self, expressions: str, syntax: bool, escaped: bool, additional_data: Dict = None, timeout: float = None) \
            -> Dict[str, Any]:
        """
        Sends a command to check some gaml expressions validity.

        :param expressions: The code to check
        :param syntax: True to only check the syntax
        :param escaped: True if the expressions are escaped already
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(self.validate_awaitable(expressions, syntax, escaped, additional_data, timeout))

    async def download_awaitable(self, file_path: str, timeout: float = None) -> Dict[str, Any]:
        """
        Downloads a file from gama server file system.

        :param file_path: the path of the file to download on gama-server's file system
        :type file_path: str
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: if everything goes well, gama-server will send back an object containing the entirety
        of the file as a string
        """
        cmd = {
            "type": CommandTypes.Download.value,
            "file": file_path,
        }
        return await self.execute_cmd_awaitable(cmd, timeout)

    def download(self, file_path, timeout: float = None) -> Dict[str, Any]:
        """
        Downloads a file from gama server file system.

        :param file_path: the path of the file to download on gama-server's file system
        :type file_path: str
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: if everything goes well, gama-server will send back an object containing the entirety
        of the file as a string
        """
        return self.event_loop.run_until_complete(self.download_awaitable(file_path, timeout))

    async def upload_awaitable(self, file_path: str, content: str, timeout: float = None) -> Dict[str, Any]:
        """
        Uploads a file to gama-server's file-system.

        :param file_path: the path on gama-server file-system where the content is going to be saved
        :param content: the content of the file to be uploaded
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        """
        cmd = {
            "type": CommandTypes.Upload.value,
            "file": file_path,
            "content": content
        }
        return await self.execute_cmd_awaitable(cmd, timeout)

    def upload(self, file_path: str, content: str, timeout: float = None) -> Dict[str, Any]:
        """
        Uploads a file to gama-server's file-system.

        :param file_path: the path on gama-server file-system where the content is going to be saved
        :type file_path: str
        :param content: the content of the file to be uploaded
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        """
        return self.event_loop.run_until_complete(self.upload_awaitable(file_path, content, timeout))

    def close_connection(self, close_code=1000, reason="") -> None:
        """
        Closes the connection.

        :param close_code: the close code, 1000 by default
        :param reason: a human-readable reason for closing.
        :return:
        """
        self.event_loop.run_until_complete(self.close_connection_async(close_code, reason))

    async def play_awaitable(self, exp_id: str, sync: bool = None, socket_id: str = "",
                             additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param sync: Boolean used to specify if the simulation must send a message once the command is received, or wait
            until the end condition is reached. Note: it only works if you previously set a value for the parameter
            "until" in the "load" command.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Play.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if sync is not None:
            cmd["sync"] = sync
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def play(self, exp_id: str, sync: bool = None, socket_id: str = "", additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param sync: Boolean used to specify if the simulation must send a message once the command is received, or wait
            until the end condition is reached. Note: it only works if you previously set a value for the parameter
            "until" in the "load" command.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(self.play_awaitable(exp_id, sync, socket_id, additional_data, timeout))

    async def pause_awaitable(self, exp_id: str, socket_id: str = "", additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to pause the experiment **exp_id**

        :param exp_id: The id of the experiment to run on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Pause.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def pause(self, exp_id: str, socket_id: str = "", additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to pause the experiment **exp_id**

        :param exp_id: The id of the experiment to run on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(self.pause_awaitable(exp_id, socket_id, additional_data, timeout))

    async def step_awaitable(self, exp_id: str, nb_step: int = 1, sync: bool = False, socket_id: str = "",
                             additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run **nb_step** of the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param nb_step: The number of steps to execute
        :param sync: If True gama-server will wait for the step(s) to finish before sending a success message, else
            the message will be sent as soon as the steps are planned by gama-server.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Step.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if sync is not None:
            cmd["sync"] = sync
        if nb_step > 1:
            cmd["nb_step"] = nb_step
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def step(self, exp_id: str, nb_step: int = 1, sync: bool = False, socket_id: str = "",
             additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run **nb_step** of the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param nb_step: The number of steps to execute
        :param sync: If True gama-server will wait for the step(s) to finish before sending a success message, else
            the message will be sent as soon as the steps are planned by gama-server.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(
            self.step_awaitable(exp_id, nb_step, sync, socket_id, additional_data, timeout))

    async def step_back_awaitable(self, exp_id: str, nb_step: int = 1, sync: bool = None, socket_id: str = "",
                                  additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run **nb_step** steps backwards of the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param nb_step: The number of steps to execute
        :param sync: If True gama-server will wait for the step(s) to finish before sending a success message, else
            the message will be sent as soon as the steps are planned by gama-server.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.StepBack.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if sync is not None:
            cmd["sync"] = sync
        if nb_step > 1:
            cmd["nb_step"] = nb_step
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def step_back(self, exp_id: str, nb_step: int = 1, sync: bool = None, socket_id: str = "",
                  additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to run **nb_step** steps backwards of the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param nb_step: The number of steps to execute
        :param sync: If True gama-server will wait for the step(s) to finish before sending a success message, else
            the message will be sent as soon as the steps are planned by gama-server.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(
            self.step_back_awaitable(exp_id, nb_step, sync, socket_id, additional_data, timeout))

    async def stop_awaitable(self, exp_id: str, socket_id: str = "", additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to stop (kill) the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Stop.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def stop(self, exp_id: str, socket_id: str = "", additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to stop (kill) the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(self.stop_awaitable(exp_id, socket_id, additional_data, timeout))

    async def reload_awaitable(self, exp_id: str, parameters: List[Dict] = None, until: str = "", socket_id: str = "",
                               additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to reload (kill + load again) the experiment **exp_id**. You can reset the experiment's
        parameters as well as the end condition.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment
            parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Reload.value,
            "exp_id": exp_id,
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if parameters:
            cmd["parameters"] = parameters
        if until and until != '':
            cmd["until"] = until
        if additional_data:
            cmd.update(additional_data)
        return await self.execute_cmd_awaitable(cmd, timeout)

    def reload(self, exp_id: str, parameters: List[Dict] = None, until: str = "", socket_id: str = "",
               additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to reload (kill + load again) the experiment **exp_id**. You can reset the experiment's
        parameters as well as the end condition.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment
            parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: Nothing
        """
        return self.event_loop.run_until_complete(
            self.reload_awaitable(exp_id, parameters, until, socket_id, additional_data, timeout))

    async def expression_awaitable(self, exp_id: str, expression: str, socket_id: str = "",
                                   additional_data: Dict = None, timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to evaluate a gaml expression in the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param expression: The expression to evaluate. Must follow the gaml syntax.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: The result of the evaluation of the expression will be sent back to the user and caught by the
            listening_loop
        """
        cmd = {
            "type": CommandTypes.Expression.value,
            "exp_id": exp_id,
            "expr": expression
        }
        # adding optional parameters
        if socket_id != "":
            cmd["socket_id"] = socket_id
        if additional_data:
            cmd.update(additional_data)

        return await self.execute_cmd_awaitable(cmd, timeout)

    def expression(self, exp_id: str, expression: str, socket_id: str = "", additional_data: Dict = None,
                   timeout: float = None) -> Dict[str, Any]:
        """
        Sends a command to evaluate a gaml expression in the experiment **exp_id**.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param expression: The expression to evaluate. Must follow the gaml syntax.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        :return: The result of the evaluation of the expression will be sent back to the user and caught by the
            listening_loop
        """
        return self.event_loop.run_until_complete(
            self.expression_awaitable(exp_id, expression, socket_id, additional_data, timeout))

    async def describe_awaitable(self, path_to_model: str, experiments: bool = True, species_names: bool = True,
                                 species_variables: bool = True, species_actions: bool = True, additional_data: Dict = None,
                                 timeout: float = None) -> Dict[str, Any]:
        """
        This command is used to ask the server more information on a given model. When received, the server will
        compile the model and return the different components found, depending on the option picked by the client.

        :param path_to_model: the model to describe
        :param experiments: Whether to show the experiment descriptions
        :param species_names: Whether to show the species names
        :param species_variables: Whether to show the species variables
        :param species_actions: Whether to show the species actions
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        """
        cmd = {
            "type": "describe",
            "model": path_to_model,
            "experiments": experiments,
            "speciesNames": species_names,
            "speciesVariables": species_variables,
            "speciesActions": species_actions
        }
        if additional_data:
            cmd.update(additional_data)
        return await self.execute_cmd_awaitable(cmd, timeout)
        
    def describe(self, path_to_model: str, experiments: bool = True, species_names: bool = True,
                 species_variables: bool = True, species_actions: bool = True, additional_data: Dict = None, timeout: float = None) \
            -> Dict[str, Any]:
        """
        This command is used to ask the server more information on a given model. When received, the server will
        compile the model and return the different components found, depending on the option picked by the client.

        :param path_to_model: the model to describe
        :param experiments: Whether to show the experiment descriptions
        :param species_names: Whether to show the species names
        :param species_variables: Whether to show the species variables
        :param species_actions: Whether to show the species actions
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
        :param timeout: timeout in seconds for this command. If None, uses default_timeout. If 0 or negative, no timeout.
        :raises asyncio.TimeoutError: if the command times out
        """
        return self.event_loop.run_until_complete(self.describe_awaitable(path_to_model, experiments, species_names,
                                                                         species_variables, species_actions, additional_data,
                                                                         timeout))

