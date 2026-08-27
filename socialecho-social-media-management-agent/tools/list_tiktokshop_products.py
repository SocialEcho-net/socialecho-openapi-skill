from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from tools.client import request_socialecho


class ListTiktokshopProductsTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage]:
        params = {
            "account_id": int(tool_parameters["account_id"]),
            "page": int(tool_parameters.get("page", 1)),
            "per_page": int(tool_parameters.get("per_page", 20)),
            "keyword": str(tool_parameters.get("keyword", "")).strip() or None,
        }
        yield self.create_json_message(request_socialecho(self.runtime.credentials, "/v1/tiktokshop/products", params))
