import json
import sys

import websockets
import asyncio
from typing import List, Dict, Callable, Any
from gama_client.command_types import CommandTypes
from gama_client.message_types import MessageTypes


class GamaBaseClient:
    # CLASS VARIABLES
    event_loop: asyncio.AbstractEventLoop
    socket: websockets.WebSocketClientProtocol
    socket_id: str
    url: str
    port: int
    message_handler: Callable

    def __init__(self, url: str, port: int, message_handler: Callable[[Dict], Any]):
        """
        Initialize the client. At this point no connection is made yet.

        :param url: A string representing the url (or ip address) where the gama-server is running
        :param port: An integer representing the port on which the server runs
        :param message_handler: A function that will be called every time a message is received from gama-server
        """
        self.url = url
        self.port = port
        self.message_handler = message_handler
        self.socket_id = ""
        self.socket = None
        self.event_loop = asyncio.get_running_loop()
        self.connection_future = None

    async def connect(self, set_socket_id: bool = True, ping_interval: float = 20, ping_timeout: float = 20):
        """
        Tries to connect the client to gama-server using the url and port given at the initialization.
        Once the connection is done it runs **start_listening_loop** and sets **socket_id** if **set_socket_id**
        is True

        :param set_socket_id: If true, the listening loop will filter out the messages of type ConnectionSuccessful and
            the GamaClient will set its socket_id itself. If set to false, the users will have to set the client's
            socket_id field themselves in the message_handler function
        :param ping_interval: The interval between each ping send to keepalive the connection, use None to deactivate this behaviour
        :param ping_timeout: The time the client is waiting for an answer to the ping sent before declaring that the connection is lost (part of the keepalive loop)
        :returns: Returns either once the listening loop starts if set_socket_id is False or when a socket_id is
            sent by gama-server
        :raise Exception: Can throw exceptions in case of connection problems.
        """
        self.connection_future = self.event_loop.create_future()
        self.socket = await websockets.connect(f"ws://{self.url}:{self.port}", ping_interval=ping_interval, ping_timeout=ping_timeout)
        self.event_loop.create_task(self.start_listening_loop(set_socket_id))
        if set_socket_id:
            self.socket_id = await self.connection_future

    async def start_listening_loop(self, handle_connection_message: bool):
        """
        Internal method. It starts an infinite listening loop that will transmit gama-server's messages to the
        message_handler function

        :param handle_connection_message: If set to true, the function checks for messages of type ConnectionSuccessful
            and will set its content field as the result of connection_future that is used in connect to wait for the socket_id
        :param timeout: timeout for reading the next message
        :return: Never returns
        """
        while self.socket.open:
            try:
                mess = await self.socket.recv()
                try:
                    js = json.loads(mess)
                    if handle_connection_message \
                        and "type" in js \
                        and "content" in js \
                        and js["type"] == MessageTypes.ConnectionSuccessful.value:

                        self.connection_future.set_result(js["content"])
                    else:
                        await self.message_handler(js)
                except Exception as js_ex:
                    print("Unable to unpack gama-server messages as a json. Error:", js_ex, "Message received:", mess)
            except Exception as sock_ex:
                if self.socket.open:
                    print("Error while waiting for a message from gama-server. Exiting", sock_ex)
                    sys.exit(-1)

    async def load(self, file_path: str, experiment_name: str, console: bool = None, status: bool = None,
                   dialog: bool = None, runtime: bool = None, parameters: List[Dict] = None, until: str = "", socket_id: str = "",
                   additional_data: Dict = None):
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
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)

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

        await self.socket.send(json.dumps(cmd))

    async def exit(self):
        """
        Sends a command to kill gama-server

        :return: Nothing
        """
        cmd = {
            "type": CommandTypes.Exit.value
        }
        await self.socket.send(json.dumps(cmd))

    async def download(self, file_path: str):
        """
        Downloads a file from gama server file system
        :type file_path: the path of the file to download on gama-server's file system
        :return: if everything goes well, gama-server will send back an object containing the entirety
        of the file as a string
        """
        cmd = {
            "type": CommandTypes.Download.value,
            "file": file_path,
        }
        await self.socket.send(json.dumps(cmd))

    async def upload(self, file_path: str, content: str):
        """
        Uploads a file to gama-server's file-system
        :param file_path: the path on gama-server file-system where the content is going to be saved
        :param content: the content of the file to be uploaded
        """
        cmd = {
            "type": CommandTypes.Upload.value,
            "file": file_path,
            "content": content
        }
        await self.socket.send(json.dumps(cmd))

    async def close_connection(self, close_code=1000, reason=""):
        """
        Closes the connection
        :param close_code: the close code, 1000 by default
        :param reason: a human-readable reason for closing.
        :return:
        """
        await self.socket.close(close_code, reason)

    async def play(self, exp_id: str, sync: bool = None, socket_id: str = "", additional_data: Dict = None):
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

        await self.socket.send(json.dumps(cmd))

    async def pause(self, exp_id: str, socket_id: str = "", additional_data: Dict = None):
        """
        Sends a command to pause the experiment **exp_id**

        :param exp_id: The id of the experiment to run on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
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

        await self.socket.send(json.dumps(cmd))

    async def step(self, exp_id: str, nb_step: int = 1, sync: bool = False, socket_id: str = "",
                   additional_data: Dict = None):
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

        await self.socket.send(json.dumps(cmd))

    async def step_back(self, exp_id: str, nb_step: int = 1, sync: bool = None, socket_id: str = "",
                        additional_data: Dict = None):
        """
        Sends a command to run **nb_step** steps backwards of the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param nb_step: The number of steps to execute
        :param sync: If True gama-server will wait for the step(s) to finish before sending a success message, else
            the message will be sent as soon as the steps are planned by gama-server.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
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

        await self.socket.send(json.dumps(cmd))

    async def stop(self, exp_id: str, socket_id: str = "", additional_data: Dict = None):
        """
        Sends a command to stop (kill) the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
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

        await self.socket.send(json.dumps(cmd))

    async def reload(self, exp_id: str, parameters: List[Dict] = None, until: str = "", socket_id: str = "",
                     additional_data: Dict = None):
        """
        Sends a command to reload (kill + load again) the experiment **exp_id**. You can reset the experiment's
        parameters as well as the end condition.

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param parameters: A list of dictionaries, each dictionary representing the initial value of an experiment parameter.
            They will be set at the initialization phase of the experiment.
        :param until: A string representing an ending condition to stop an experiment run by gama-server.
            It must be expressed in the gaml language.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
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
        await self.socket.send(json.dumps(cmd))

    async def expression(self, exp_id: str, expression: str, socket_id: str = "", additional_data: Dict = None):
        """
        Sends a command to evaluate a gaml expression in the experiment **exp_id**

        :param exp_id: The id of the experiment on which the command applies
            (sent by gama-server after the load command)
        :param socket_id: The socket_id that is linked to the experiment, if empty gama will use current connection
        :param expression: The expression to evaluate. Must follow the gaml syntax.
        :param additional_data: A dictionary containing any additional data you want to send to gama server. Those will
            be sent back with the command's answer. (for example an id for the client's internal use)
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

        await self.socket.send(json.dumps(cmd))
