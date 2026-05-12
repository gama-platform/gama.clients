import unittest
from typing import Dict, Any, List

from gama_client.sync_client import GamaSyncClient
from gama_client.message_types import MessageTypes

url = "localhost"
port = 6868

class TestFiles(unittest.IsolatedAsyncioTestCase):

    client: GamaSyncClient

    async def asyncSetUp(self):
        self.client = GamaSyncClient(url, port, default_timeout=10)
        self.client.connect()

    async def test_upload_and_download(self):
        # We upload a simple text file
        file_path = "test_upload_download.txt"
        content = "Hello from Gama Client Tests!"

        upload_res = self.client.upload(file_path, content)
        self.assertEqual(upload_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

        # Now we download it back
        download_res = self.client.download(file_path)
        self.assertEqual(download_res["type"], MessageTypes.CommandExecutedSuccessfully.value)
        self.assertEqual(download_res["content"], content)

    async def test_download_fake_file(self):
        download_res = self.client.download("fake_file_that_does_not_exist.txt")
        self.assertEqual(download_res["type"], MessageTypes.UnableToExecuteRequest.value)

    async def test_upload_empty_content(self):
        upload_res = self.client.upload("empty.txt", "")
        self.assertEqual(upload_res["type"], MessageTypes.CommandExecutedSuccessfully.value)

    async def asyncTearDown(self):
        self.client.close_connection()

if __name__ == '__main__':
    unittest.main()
