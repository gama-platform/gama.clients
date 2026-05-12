import unittest
from gama_client.sync_client import GamaSyncClient

url = "localhost"
port = 6868

class TestExit(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=10)
        self.client.connect()

    @unittest.skip("Skipping test_exit because it kills the server and breaks other tests.")
    async def test_exit(self):
        # We don't really get a response, the socket just closes
        try:
            self.client.exit()
        except Exception:
            pass
        # Connection should be closed now

    async def asyncTearDown(self):
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
