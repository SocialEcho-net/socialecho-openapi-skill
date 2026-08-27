# SocialEcho OpenAPI Integrations

SocialEcho 对外社媒 OpenAPI 的 Skill 与第三方平台适配器。

## 当前版本

- Canonical Codex/Agent Skill：`social-media-autopilot/`，版本 `2.1.0`
- ClawHub/Node 兼容包：仓库根目录与 `socialecho-skills/`，版本 `2.1.0`
- 轻量旧版兼容包：`socialecho-openapi-skill/`，版本 `1.2.0`
- Dify Tool Plugin：`socialecho-social-media-management-agent/`，版本 `0.2.0`
- Zapier CLI Integration：`zapier-socialecho/`，版本 `1.1.0`
- n8n Community Node 独立仓库：[n8n-nodes-socialecho-management-agent](https://github.com/SocialEcho-net/n8n-nodes-socialecho-management-agent)，版本 `0.2.0`

## 接口范围

覆盖团队、账号、OAuth 授权链接、贴文、报表、OSS 上传地址、Reddit 社区、Pinterest 图版、TikTok Shop 商品/同步/音乐及跨平台发布。

所有 GET 参数使用 QueryString，GET 请求不得携带 body。数组使用 `account_ids[]=1&account_ids[]=2`；否则 CloudFront 可能直接返回 HTML `403 Bad request`。

发布选中 TikTok/TikTok Shop 音乐时，`extra.music` 必须完整传递 `url`、`uuid`、`cover`、`title`、`artist`、`duration`、`selection`、`music_volume`、`original_sound_volume` 九个字段。

成功判定统一为 HTTP `2xx` 且 JSON `code = 0`。

## OpenAPI

运行以下命令可重新生成根目录及兼容包中的 OpenAPI JSON/YAML：

```bash
node ./scripts/generate-openapi.mjs
```
