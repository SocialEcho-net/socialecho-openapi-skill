---
name: socialecho-openapi
description: >-
  Call the SocialEcho external API (app.socialecho.net) with a Team API key: team, accounts, articles, reports, and OSS presign
  (GET /v1/upload/url with required content_type QueryString parameter). Use for integration checks,
  automation, and n8n/Dify-style data pulls. Aligns with the project’s socialEchoApidocs_cn.md / v1.1.0 OpenAPI.
---

# SocialEcho OpenAPI 技能包

在自动化或本地脚本中调用 **SocialEcho 外部 API**（`https://api.socialecho.net`）。**权威长文档**以仓库内 `socialEchoApidocs_cn.md`（与帮助中心 [OpenAPI 在线文档](https://help.socialecho.cn/docs/socialecho-openapi-docs) 结构一致）为准；本页只放对接要点与 CLI 用法。

## 先决条件

1. 在 [app.socialecho.net](https://app.socialecho.net) 注册并加入团队。  
2. 在**团队管理**中创建 **Team API Key**（`se_` 开头）。  
3. 用 **Bearer** 调用：`Authorization: Bearer se_xxx`  
4. 可选请求头：`X-Lang: zh_CN` 或 `en`  
5. CLI 通过**显式参数**传入密钥，勿依赖环境变量自动注入（与脚本约定一致）：
   - `--api-key`（必填）
   - `--base-url`（可选，默认 `https://api.socialecho.net`）
   - `--team-id`（可选，部分报表/场景下服务端可能要求）
   - `--lang`（可选，默认 `zh_CN`）

## 传输与成功判定（必读）

- **GET + QueryString**：所有 GET 参数放在 QueryString 中，GET 请求不得携带 body。CloudFront 会对带 body 的 GET 直接返回 `403`。数组使用 `account_ids[]=1&account_ids[]=2`。
- **成功**：`HTTP 2xx` 且响应 JSON 的 `code` 为 **0**。其他情况作失败并记录 `message`、`request_id` 与业务码。
- **限流**：单 Key 约 **120 次/分钟**；批处理请加节流与 **429 指数退避**（如 1s / 2s / 4s）。

## 获取 OSS 上传地址：`GET /v1/upload/url`

发布类流程建议 **先取上传地址 → 上传文件 → 将返回的文件 URL 填入发布接口的 `attachments`**（见长文档 **5.5、5.8 节**）。

- **QueryString 必填** `content_type`（`string`）：**与实际上传文件一致的** MIME 类型。
- **仅允许**下列枚举（与 `socialEchoApidocs_cn.md` 第 5.5 节一致；脚本 `upload.js` 中亦有同名常量 `CONTENT_TYPE_ENUM` 校验）：

| 图片 | 视频 |
| ---- | ---- |
| `image/jpeg` `image/jpg` `image/png` `image/gif` `image/webp` `image/bmp` | `video/mp4` `video/avi` `video/mov` `video/wmv` `video/flv` `video/webm` `video/mkv` `video/3gp` `video/quicktime` |

示例：

```bash
node ./upload.js --api-key se_xxx --content-type image/png
# 等效：--content_type image/png
```

## 环境准备

```bash
cd socialecho-openapi-skill
npm ci
# 无依赖时：npm 仅用于包元数据；无第三方依赖
```

## CLI 命令摘要

```bash
node ./team.js --api-key YOUR_KEY
node ./account.js --api-key YOUR_KEY --page 1 --type 1
node ./article.js --api-key YOUR_KEY --page 1 --account-ids 41,42
node ./report.js --api-key YOUR_KEY --start-date 2026-01-01 --end-date 2026-03-24 --time-type 1 --group day --account-ids 41,42
node ./upload.js --api-key YOUR_KEY --content-type video/mp4
```

- `article` / `report` 的 `--account-ids` 为**逗号分隔的整数**；在请求 JSON 中会以 **整数数组** `account_ids` 发送。  
- 或：`npm run team` / `npm run account` 等（见 `package.json` 的 `scripts`）。

## 与旧版实现的差异

- `1.2.0` 起所有 GET 请求改为无 body 的 QueryString 传输，兼容 CloudFront；旧版 `GET + JSON body` 客户端必须升级。
- 退出码：子命令在**业务失败**（`code` 非 200/0 等）时 `process.exit(1)` 并打印完整 `body` JSON。

## 调试用环境

- 可用 `--base-url https://api-dev.socialecho.net` 指向开发环境（若你方有部署）；线上默认 `https://api.socialecho.net`。
