import asyncio
import unittest

from gama_client.sync_client import GamaSyncClient

url = "localhost"
port = 6868


class TestExit(unittest.TestCase):

    client: GamaSyncClient
    loop: asyncio.AbstractEventLoop

    @classmethod
    def setUpClass(cls):
        cls.client = GamaSyncClient(url, port, default_timeout=10)
        cls.client.connect()
        cls.loop = cls.client.event_loop

    @classmethod
    def tearDownClass(cls):
        try:
            cls.client.close_connection()
        except Exception as e:
            print(f"Error closing connection: {e}")

    @unittest.skip("Skipping test_exit because it kills the server and breaks other tests.")
    def test_exit(self):
        # We don't really get a response, the socket just closes
        try:
            self.client.exit()
        except Exception:
            pass
        # Connection should be closed now


if __name__ == '__main__':
    unittest.main()
