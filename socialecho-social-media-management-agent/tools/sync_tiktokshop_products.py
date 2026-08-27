from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from tools.client import request_socialecho_post


class SyncTiktokshopProductsTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage]:
        body = {"account_id": int(tool_parameters["account_id"])}
        yield self.create_json_message(request_socialecho_post(self.runtime.credentials, "/v1/tiktokshop/products/sync", body))
