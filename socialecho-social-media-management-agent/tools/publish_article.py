from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from tools.client import parse_json_object, request_socialecho_post, validate_selected_music


class PublishArticleTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage]:
        raw = tool_parameters.get("body_json", "")
        if raw is None or (isinstance(raw, str) and not str(raw).strip()):
            raise ValueError("body_json is required: a JSON object string for POST /v1/publish/article")
        body = parse_json_object(str(raw))
        validate_selected_music(body)

        result = request_socialecho_post(
            credentials=self.runtime.credentials,
            path="/v1/publish/article",
            body=body,
            timeout=120,
        )
        yield self.create_json_message(result)
