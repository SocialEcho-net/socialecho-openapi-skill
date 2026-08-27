from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from tools.client import request_socialecho


class ListTiktokshopTrendingMusicTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage]:
        params = {
            "account_id": int(tool_parameters["account_id"]),
            "country_code": str(tool_parameters.get("country_code", "")).strip() or None,
            "genre": str(tool_parameters.get("genre", "")).strip() or None,
            "date_range": str(tool_parameters.get("date_range", "")).strip() or None,
        }
        yield self.create_json_message(request_socialecho(self.runtime.credentials, "/v1/tiktokshop/music/trending", params))
