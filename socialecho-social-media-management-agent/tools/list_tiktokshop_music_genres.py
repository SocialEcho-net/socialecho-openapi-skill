from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage
from tools.client import request_socialecho


class ListTiktokshopMusicGenresTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage]:
        yield self.create_json_message(request_socialecho(self.runtime.credentials, "/v1/tiktokshop/music/genres"))
