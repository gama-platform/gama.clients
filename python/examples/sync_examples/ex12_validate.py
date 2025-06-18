import asyncio
import argparse

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes


async def show_unexpected_message(mess):
    print(mess)

async def main():
    """
    This example shows how to manipulate the validate function to check that a piece of code follows
    the gaml syntax.
    """

    # Experiment and Gama-server constants
    parser = argparse.ArgumentParser()
    parser.add_argument("-u", "--url", help="Gama server url", default="localhost")
    parser.add_argument("-p", "--port", help="Gama server port", default=6868)
    args = parser.parse_args()

    client = GamaSyncClient(args.url, args.port, other_message_handler=show_unexpected_message)

    print("connecting to Gama server")
    try:
        client.connect()
    except Exception as e:
        print("error while connecting to the server", e)
        return

    print("testing a syntactically correct expression")
    gama_response = client.validate("let l <- [1,2,3]", syntax=True, escaped=False)
    print("received:", gama_response)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Syntax error in the expression tested:", gama_response)
        return
    print("the expression is validated by gama-server")

    print("testing a syntactically wrong expression")
    gama_response = client.validate("let l <- [1,2,3,,]", syntax=True, escaped=False)
    print("received:", gama_response)
    if gama_response["type"] == MessageTypes.UnableToExecuteRequest.value:
        print("As expected, there's a syntax error in the expression tested:", gama_response)
    else:
        print("an error should have been detected but wasn't")
        return

    print("testing a syntactically correct expression but with semantic mistake, checking only syntax")
    gama_response = client.validate("let l <- llama", syntax=True, escaped=False)
    print("received:", gama_response)
    if gama_response["type"] != MessageTypes.CommandExecutedSuccessfully.value:
        print("Syntax error in the expression tested:", gama_response)
        return
    print("the expression is validated by gama-server")

    print("testing the same syntactically correct expression but with semantic mistake, checking everything now.")
    gama_response = client.validate("let l <- llama", syntax=False, escaped=False)
    print("received:", gama_response)
    if gama_response["type"] == MessageTypes.UnableToExecuteRequest.value:
        print("As expected, there's an error in the expression tested:", gama_response)
    else:
        print("an error should have been detected but wasn't")
        return

    print("closing the connection")
    client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())
