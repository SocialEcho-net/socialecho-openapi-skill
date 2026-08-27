# SocialEcho OpenAPI 文档

更新日期：2026-08-11

## 1. 文档适用对象

本文档面向需要对接 SocialEcho 外部 API 的研发、测试、实施与自动化工程师。目标是让你在最短时间内完成可用对接。

---

## 2. 快速接入（3 分钟）

1. 登录 [https://app.socialecho.net](https://app.socialecho.net) 并创建团队。
2. 在「团队管理」中创建 **Team API Key**。
3. 使用 **Bearer** 鉴权调用 API（`Authorization: Bearer se_xxx`）。
4. 先调用 `GET /v1/team` 验证鉴权与团队上下文，再调用其他业务接口。
5. 以 HTTP 状态码判断请求结果，再结合响应中的业务 `code` 识别具体原因。

---

## 3. 环境与鉴权

| 字段 | 说明 |
|---|---|
| Base URL | `https://api.socialecho.net` |
| 鉴权方式 | Bearer Token（Team API Key） |
| 请求头 | `Authorization: Bearer se_your_team_api_key` |
| 可选请求头 | `X-Lang: zh_CN` 或 `en` |
| 频率限制 | 单个 API Key 最多 **120 次请求/分钟** |

### 3.1 传输形态说明（与线上一版文档的差异）

所有 GET 接口的业务参数统一放在 QueryString 中，请求不得携带 body。数组参数使用方括号键，例如 `account_ids[]=1&account_ids[]=2`。CloudFront 收到带 body 的 GET 请求会直接返回 HTML `403 Bad request`。

### 3.2 推荐成功判定口径

- 成功响应：HTTP 状态码为 `200～299`，且响应 JSON 中 `code` 必须为 `0`。当前本文档所列接口正常成功时均返回 HTTP `200`。
- 失败响应：HTTP 状态码为 `400～599`，响应 JSON 中 `code` 为非零业务码。业务失败不再使用 HTTP `200` 返回。
- 客户端应先按 HTTP 状态码进入成功或失败分支，再使用业务 `code`、`error.type` 和 `data` 做细分处理。
- 收到非 `2xx` 响应时仍应解析 JSON 响应体，并记录 `request_id`；不要将所有非 `2xx` 都当成无法解析的网络错误。
- 发布接口返回成功仅表示任务提交成功；最终平台发布结果由异步任务及平台审核决定。

### 3.3 统一响应结构

成功响应示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {},
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

失败响应示例：

```json
{
  "code": 42200,
  "message": "请求参数验证失败",
  "data": {
    "account_id": ["请选择 TikTok Shop 账号"]
  },
  "error": {
    "type": "invalid_request",
    "reason": "请求参数验证失败",
    "suggestion": "请检查请求参数后重试"
  },
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

服务端同时在响应头返回 `X-Request-Id`。调用方可以自行传入符合格式的 `X-Request-Id`，也可以使用服务端生成的值串联日志。分页成功响应会额外包含 `meta`。

---

## 4. 通用错误处理策略

| HTTP 状态 | 标准业务码 | 含义与处理建议 |
|---|---:|---|
| 400 Bad Request | `40000` | 请求语法、格式或基础参数错误；修正请求后再提交 |
| 401 Unauthorized | `40100` | API Key 缺失、无效或过期；检查 `Authorization: Bearer ...` |
| 403 Forbidden | `40300` | 已鉴权但无权执行操作，例如没有草稿权限；不要原样重试 |
| 404 Not Found | `40400` | 账号、商品、关联授权或其他资源不存在、不可用，或不属于当前团队 |
| 405 Method Not Allowed | `40500` | HTTP 方法不受支持；按 `Allow` 响应头改用正确方法 |
| 409 Conflict | `40900` | 当前资源状态与操作冲突；刷新资源状态后再决定是否重试 |
| 413 Payload Too Large | `41300` | 请求体或上传内容超过服务端限制；缩小文件或请求体 |
| 419 Authentication Timeout | `41900` | 会话或安全令牌失效；对 Team API Key 接口通常不应出现 |
| 422 Unprocessable Entity | `42200` | 字段校验、平台发布规则或可处理的业务前置条件失败；读取 `data` 中的字段错误 |
| 429 Too Many Requests | `42900` | 触发接口限流或商品同步冷却；优先读取 `Retry-After`，若无则读取 `data.next_allowed_at` 或提示信息 |
| 500 Internal Server Error | `50000` | SocialEcho 服务端异常；保留 `request_id` 并联系支持 |
| 502 Bad Gateway | `50200` | 上游社媒平台调用失败；建议稍后重试并保留 `request_id` |
| 503/504 | `50300` / `50400` | 服务暂不可用或上游超时；按退避策略重试 |
| 超时/网络异常 | 无响应体 | 建议重试 2～3 次，并保留请求参数快照用于排查 |

标准业务码采用“HTTP 状态码 × 100”的形式。少数历史业务场景可能保留更细的自定义非零 `code`；这不会改变 HTTP 状态码语义，调用方不应只依赖单个业务码判断成功或失败。

建议仅自动重试 `429`、`502`、`503`、`504` 和网络超时。`400`、`401`、`403`、`404`、`405`、`409`、`413`、`422` 通常需要先修正请求、权限或资源状态。

---

## 5. 接口清单

以下示例 Base URL 均为 `https://api.socialecho.net`。请将 `se_your_team_api_key` 替换为你的 Team API Key。

GET 示例不发送 `Content-Type` 和请求体；有参数时直接拼接 QueryString。

### 5.1 获取当前 API Key 可访问的团队信息（GET /v1/team）

建议先调用该接口，确认团队上下文后再拉取业务数据。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | `zh_CN` 或 `en`，默认 `zh_CN` |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/team' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": {
    "id": 1024,
    "code": "TEAM_ABC123",
    "title": "SocialEcho QA Team",
    "timezone": {
      "name": "Asia/Shanghai",
      "offset": "UTC+08:00"
    }
  },
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

---

### 5.2 获取社媒账号列表（GET /v1/account）

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| page | query | 否 | integer | 页码，不传时以服务端默认值为准 |
| type | query | 否 | integer | `1` = 授权账号，`2` = 竞品账号 |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/account?page=1&type=1' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [{
    "id": 163751,
    "title": "example_account",
    "account": "example_account",
    "url": "https://www.tiktok.com/@example_account",
    "app": {"id": 11, "title": "TikTokShop"},
    "type": {"value": 1, "label": "自有账户"},
    "status": {"value": 1, "label": "正常"}
  }],
  "meta": {"total": 1, "current_page": 1, "last_page": 1, "per_page": 15},
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

---

### 5.3 获取平台授权链接（GET /v1/oauth/links）

获取当前团队可使用的社媒平台授权入口。接口按平台返回一个或多个连接方式，调用方可根据 `data[].id`、`data[].title` 和 `connections[].type` 选择对应的授权 URL。

本接口无业务参数。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| Authorization | header | 是 | string | `Bearer se_your_team_api_key` |
| X-Lang | header | 否 | string | `zh_CN` 或 `en`，默认 `zh_CN` |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/oauth/links' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例（节选，URL 已脱敏）**

```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "title": "Instagram",
      "connections": [
        {
          "type": "instagram",
          "url": "https://authorization.example/instagram"
        },
        {
          "type": "facebook",
          "url": "https://authorization.example/facebook"
        }
      ]
    },
    {
      "id": 3,
      "title": "TikTok",
      "connections": [
        {
          "type": "personal",
          "url": "https://authorization.example/tiktok"
        }
      ]
    },
    {
      "id": 11,
      "title": "TikTokShop",
      "connections": [
        {
          "type": "seller",
          "url": "https://authorization.example/tiktokshop/seller"
        },
        {
          "type": "creator",
          "url": "https://authorization.example/tiktokshop/creator"
        }
      ]
    }
  ],
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

返回字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| data[].id | integer | 平台 ID，与账号列表中的 `app.id` 对应 |
| data[].title | string | 平台名称 |
| data[].connections | object[] | 该平台支持的授权入口列表 |
| data[].connections[].type | string | 授权连接类型，用于区分同一平台的授权模式 |
| data[].connections[].url | string | 可直接打开的授权 URL，可能包含团队上下文或一次性状态参数 |

当前返回的平台与连接类型：

| 平台 | 平台 ID | connection type |
|---|---:|---|
| Instagram | 1 | `instagram`、`facebook` |
| Facebook | 2 | `default` |
| TikTok | 3 | `personal` |
| LinkedIn | 4 | `default` |
| YouTube | 5 | `default` |
| Telegram | 6 | `default` |
| X | 7 | `default` |
| Pinterest | 8 | `personal` |
| Reddit | 9 | `default` |
| Threads | 10 | `personal` |
| TikTokShop | 11 | `seller`、`creator` |

授权 URL 应按接口原值直接打开，不要改写或丢弃查询参数。URL 可能包含与团队关联的状态信息，不建议长期缓存、公开分享或写入普通业务日志；需要授权时应重新调用本接口获取。

| HTTP 状态 | 业务码 | 场景 |
|---|---:|---|
| 200 | `0` | 成功返回平台授权入口 |
| 401 | `40100` | Team API Key 缺失、无效或过期 |
| 405 | `40500` | 请求方法错误，应使用 `GET` |
| 422 | `42200` | 团队积分不足等业务前置条件失败 |
| 500 | `50000` | 生成授权链接时发生未预期的服务端异常 |

---

### 5.4 获取贴文列表（GET /v1/article）

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| page | query | 否 | integer | 页码 |
| account_ids | query | 否 | integer[] | 重复使用 `account_ids[]` 传递账号 ID 数组 |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/article?page=1&account_ids[]=163956&account_ids[]=163955&account_ids[]=28' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例**

```json
{
  "code": 0,
  "message": "成功",
  "data": [{
    "id": 987654,
    "uuid": "platform_post_id",
    "title": null,
    "content": "Example article content",
    "url": "https://www.example.com/post/platform_post_id",
    "app": {"id": 3, "title": "TikTok"},
    "account": {"id": 163751, "account": "example_account"},
    "report": {"exposure": 1021, "like": 40, "comment": 14, "share": 0}
  }],
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

---

### 5.5 获取报表数据（GET /v1/report）

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| start_date | query | 是 | string | `YYYY-MM-DD` |
| end_date | query | 是 | string | `YYYY-MM-DD` |
| time_type | query | 是 | integer | `1` = 日期内新增贴文，`2` = 历史全部贴文 |
| account_ids | query | 否 | integer[] | 重复使用 `account_ids[]` 传递账号 ID 数组 |
| group | query | 否 | string | 不传 = 总量；`day` / `app` / `account` 为分组维度 |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/report?start_date=2026-01-01&end_date=2026-03-24&time_type=1&group=day&account_ids[]=163956&account_ids[]=163955&account_ids[]=28' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例（汇总）**

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "scope": {
      "start_date": "2026-01-01",
      "end_date": "2026-03-24",
      "time_type": 1,
      "group": ""
    },
    "totals": {"exposure": 120345, "like": 4512, "comment": 893, "share": 326}
  },
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

---

### 5.6 获取 OSS 上传地址（GET /v1/upload/url）

用于获取文件上传到 OSS 所需的预签名 URL。一般流程为：获取上传 URL → 使用返回的 HTTP 方法上传文件 → 将 `public_url` 用于发布接口的 `attachments`。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| content_type | query | 是 | string | 待上传文件的 MIME 类型，必须与实际文件一致 |
| title | query | 否 | string | 文件名称，最长 255 字符 |

`content_type` 枚举：

- 图片：`image/jpeg`、`image/jpg`、`image/png`、`image/gif`、`image/webp`、`image/bmp`。
- 视频：`video/mp4`、`video/avi`、`video/mov`、`video/wmv`、`video/flv`、`video/webm`、`video/mkv`、`video/3gp`、`video/quicktime`。

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/upload/url?content_type=video%2Fmp4&title=product-video.mp4' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**上传文件示例**

```bash
curl --request PUT 'upload_url_from_previous_response' \
  --header 'Content-Type: video/mp4' \
  --upload-file './product-video.mp4'
```

上传成功后，发布接口应使用响应中的 `public_url`，不要使用有时效性的 `upload_url`。

本接口成功返回 HTTP `200`、`code = 0`；缺少参数、字段类型错误或字段过长返回 HTTP `422`、`code = 42200`；生成上传地址时发生服务端异常返回 HTTP `500`、`code = 50000`。调用方应只提交上方列出的 MIME 类型；当前服务端会将不受支持的 MIME 类型按 HTTP `500`、`code = 50000` 返回。

---

### 5.7 获取 Reddit 社区列表（GET /v1/reddit/communities）

发布 Reddit 内容前，可用于选择社区上下文。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| account_id | query | 是 | integer | Reddit 社媒账号 ID |

```bash
curl --request GET 'https://api.socialecho.net/v1/reddit/communities?account_id=163751' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

---

### 5.8 获取 Pinterest 图版列表（GET /v1/pinterest/boards）

发布 Pinterest 内容前，可用于选择图版（board）。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| account_id | query | 是 | integer | Pinterest 社媒账号 ID |

```bash
curl --request GET 'https://api.socialecho.net/v1/pinterest/boards?account_id=163751' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

---

### 5.9 获取 TikTok Shop 商品列表（GET /v1/tiktokshop/products）

获取指定 TikTok Shop 账号已同步的商品。发布带货视频前，应先调用本接口取得完整的 `id`、`uuid`、`title` 和 `thumb`。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| account_id | query | 是 | integer | TikTok Shop 账号 ID，可通过 `/v1/account` 获取 |
| page | query | 否 | integer | 页码，默认 1 |
| per_page | query | 否 | integer | 每页数量，范围 1～100，默认 20 |
| keyword | query | 否 | string | 商品标题关键词，最长 500 字符 |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/tiktokshop/products?account_id=123456&page=1&per_page=20&keyword=vase' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例**

```json
{
  "code": 0,
  "message": "成功",
  "data": [{
    "id": 789,
    "uuid": "1732443576158556877",
    "title": "Ceramic Flower Vase",
    "thumb": "https://oss.example.com/product.jpg",
    "status": 1,
    "price": {"min": "68.88", "max": "68.88", "currency": "USD"}
  }],
  "meta": {"total": 1, "current_page": 1, "last_page": 1, "per_page": 20},
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

`status = 1` 表示商品当前可用于发布。中文关键词未命中时，建议使用商品英文标题，或不传 `keyword` 获取全部商品。

| HTTP 状态 | 业务码 | 场景 |
|---|---:|---|
| 200 | `0` | 成功返回商品列表 |
| 404 | `40400` | TikTok Shop 账号不存在、不可用、未授权或不属于当前团队 |
| 422 | `42200` | `account_id`、分页或关键词参数不符合要求 |
| 500 | `50000` | 查询商品时发生未预期的服务端异常 |

#### 5.9.1 提交 TikTok Shop 商品同步任务（POST /v1/tiktokshop/products/sync）

请求 SocialEcho 异步刷新指定 TikTok Shop 账号的商品。该接口只表示同步任务是否成功进入队列，不表示商品已完成刷新。为避免重复同步，同一账号存在约 60 分钟冷却时间。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| account_id | body | 是 | integer | TikTok Shop 账号 ID |

```bash
curl --request POST 'https://api.socialecho.net/v1/tiktokshop/products/sync' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Content-Type: application/json' \
  --header 'X-Lang: zh_CN' \
  --data-raw '{"account_id":123456}'
```

成功响应：

```json
{
  "code": 0,
  "message": "商品同步任务已提交",
  "data": {
    "account_id": 123456,
    "status": "queued"
  },
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

| HTTP 状态 | 业务码 | 场景 |
|---|---:|---|
| 200 | `0` | 同步任务已进入队列 |
| 404 | `40400` | 账号不存在、不可用、未授权或不属于当前团队 |
| 422 | `42200` | 缺少 `account_id`，或账号类型不支持商品同步 |
| 429 | `42900` | 同步任务正在进行或仍处于冷却期；按 `data.next_allowed_at`、`Retry-After`（若有）或提示信息延后重试 |
| 500 | `50000` | 同步任务提交失败；保留 `request_id` 联系支持 |

---

### 5.10 获取 TikTok Shop 音乐分类（GET /v1/tiktokshop/music/genres）

获取趋势音乐接口支持的音乐分类。本接口无业务参数。

```bash
curl --request GET 'https://api.socialecho.net/v1/tiktokshop/music/genres' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例（节选）**

```json
{
  "code": 0,
  "message": "成功",
  "data": [
    {"value": "ALL", "label": "全部"},
    {"value": "POP", "label": "流行"},
    {"value": "BGM", "label": "背景音乐"}
  ],
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

本接口成功返回 HTTP `200`、`code = 0`。积分不足等业务前置条件返回 HTTP `422`、`code = 42200`；未预期的服务端异常返回 HTTP `500`、`code = 50000`。鉴权失败、请求方法错误等情况遵循第 4 节通用状态码规范。

---

### 5.11 获取 TikTok Shop 趋势音乐（GET /v1/tiktokshop/music/trending）

获取 TikTok 商业音乐库中的可用音乐。`account_id` 应传 TikTok Shop 账号 ID，服务端会使用其关联的 TikTok 授权账号查询音乐。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| account_id | query | 是 | integer | TikTok Shop 账号 ID |
| country_code | query | 否 | string | 两位国家代码，如 `US` |
| genre | query | 否 | string | 分类值，通过音乐分类接口获取 |
| date_range | query | 否 | string | `1DAY`、`7DAY`、`30DAY` 或 `90DAY` |

**请求示例（cURL）**

```bash
curl --request GET 'https://api.socialecho.net/v1/tiktokshop/music/trending?account_id=123456&country_code=US&genre=BGM&date_range=7DAY' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Accept: application/json' \
  --header 'X-Lang: zh_CN'
```

**响应示例**

```json
{
  "code": 0,
  "message": "成功",
  "data": [{
    "uuid": "6817383821571262465",
    "title": "A lovely acoustic song",
    "artist": "Hiraoka",
    "url": "https://example.tiktokcdn.com/music",
    "cover": "https://example.tiktokcdn.com/cover.jpeg",
    "duration": 81
  }],
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

音乐列表 `data[]` 返回字段如下：

| 字段 | 类型 | 说明 |
|---|---|---|
| uuid | string | 音乐唯一标识；发布时传入 `extra.music.uuid` |
| title | string | 音乐标题 |
| artist | string | 音乐作者或表演者 |
| url | string | 音乐试听地址 |
| cover | string | 音乐封面地址 |
| duration | integer | 音乐时长，单位为秒 |

`selection`、`music_volume` 和 `original_sound_volume` 不是音乐列表接口的返回字段，而是发布时由调用方设置的音乐控制参数。选择音乐发布时，必须将音乐列表返回的 `url`、`uuid`、`cover`、`title`、`artist`、`duration` 六个字段原值完整复制到 `extra.music`，再补充 `selection`、`music_volume` 和 `original_sound_volume` 三个发布控制字段。不得只传音乐 UUID，也不得缩减为四字段对象。

**完整音乐对象示例**

```json
{
  "url": "https://sf16-ies-music-sg.tiktokcdn.com/obj/tos-alisg-ve-2102/oUNQD7eSEFCC1sggYZ9DQY0OdArrcwoj6BofBk",
  "uuid": "7231997808928032770",
  "cover": "https://p16-sg.tiktokcdn.com/aweme/100x100/tos-alisg-v-2774/oYHMADhIgAFdBaDftgrjLQoIsFZSsCeZEIpBAa.jpeg",
  "title": "Boundless Worship",
  "artist": "Josué Novais Piano Worship",
  "duration": 715,
  "selection": "trending_clip",
  "music_volume": 50,
  "original_sound_volume": 0
}
```

| HTTP 状态 | 业务码 | 场景 |
|---|---:|---|
| 200 | `0` | 成功返回趋势音乐 |
| 404 | `40400` | TikTok Shop 账号不存在，或没有可用于查询音乐的 TikTok 授权账号 |
| 422 | `42200` | `account_id`、国家、分类或时间范围参数不符合要求 |
| 429 | `42900` | 触发接口频率限制；按 `Retry-After` 延后重试 |
| 502 | `50200` | TikTok 商业音乐库等上游服务调用失败 |
| 500 | `50000` | 查询音乐时发生其他未预期的服务端异常 |

---

### 5.12 发布贴文（POST /v1/publish/article）

跨平台发布。`type`、`extra`、`attachments` 等字段与平台强相关，请按目标平台补齐。

| 参数名 | 位置 | 必填 | 类型 | 说明 |
|---|---|---|---|---|
| X-Lang | header | 否 | string | 返回语言 |
| account_id | body | 是 | integer | 发布所用社媒账号 ID |
| type | body | 是 | string | 发布类型，按平台取值 |
| status | body | 是 | integer | `0` = 草稿，`1` = 发布 |
| scheduled_at | body | 否 | string | 定时时间；`status = 1` 时可填，不填则立即发布 |
| comment | body | 是 | string[] | 评论数组，可为空数组 |
| content | body | 否 | string | 正文内容；部分平台要求必填 |
| extra | body | 是 | object | 平台扩展字段 |
| attachments | body | 是 | object[] | 附件列表，每项至少包含已上传文件的 `url` |

`type` 取值示例：

- Facebook：`reels` / `post` / `stories`。
- YouTube：`shorts` / `video`。
- Instagram：`reels` / `post` / `stories`。
- X：`short_post` / `long_post`。
- LinkedIn：`post`。
- TikTok：`video` / `photo`。
- TikTok Shop：`video`。
- Pinterest：`post`。
- Reddit：`text` / `link` / `media`。

**通用请求示例（cURL）**

```bash
curl --request POST 'https://api.socialecho.net/v1/publish/article' \
  --header 'Authorization: Bearer se_your_team_api_key' \
  --header 'Content-Type: application/json' \
  --header 'X-Lang: zh_CN' \
  --data @publish-payload.json
```

#### 5.12.1 发布 TikTok Shop 带货视频

发布前应依次完成：

1. 调用 `/v1/account` 获取状态正常的 TikTok Shop 账号 ID。
2. 调用 `/v1/tiktokshop/products` 获取需要绑定的商品。
3. 可选调用音乐分类和趋势音乐接口选择音乐。
4. 调用 `/v1/upload/url` 并将视频上传至 OSS。
5. 使用上传响应中的 `public_url` 提交发布请求。

**publish-payload.json 示例**

```json
{
  "account_id": 123456,
  "type": "video",
  "status": 1,
  "content": "A simple statement piece for every cozy corner. #HomeDecor #TikTokShop",
  "extra": {
    "title": "Minimalist Ceramic Vase",
    "product": {
      "id": 789,
      "uuid": "1732443576158556877",
      "title": "Ceramic Flower Vase",
      "thumb": "https://oss.example.com/product.jpg"
    },
    "music": {
      "url": "https://sf16-ies-music-sg.tiktokcdn.com/obj/tos-alisg-ve-2102/oUNQD7eSEFCC1sggYZ9DQY0OdArrcwoj6BofBk",
      "uuid": "7231997808928032770",
      "cover": "https://p16-sg.tiktokcdn.com/aweme/100x100/tos-alisg-v-2774/oYHMADhIgAFdBaDftgrjLQoIsFZSsCeZEIpBAa.jpeg",
      "title": "Boundless Worship",
      "artist": "Josué Novais Piano Worship",
      "duration": 715,
      "selection": "trending_clip",
      "music_volume": 50,
      "original_sound_volume": 0
    }
  },
  "attachments": [{
    "url": "https://oss.example.com/product-video.mp4"
  }],
  "comment": []
}
```

TikTok Shop 字段要求：

- `account_id` 必须是状态正常且属于当前团队的 TikTok Shop 账号。
- `type` 固定为 `video`。
- `content` 必填，按 UTF-16 code unit 计算不超过 2200。
- `extra.title` 必填，最多 30 个字符，仅支持 Unicode 字母、数字和空格（可包含中文等语言文字，不支持标点符号）。
- `extra.product` 必填，`id`、`uuid`、`title` 和 `thumb` 必须直接取自商品列表接口。
- 商品必须处于可用状态，即商品列表返回 `status = 1`。
- `extra.music` 可选；选择音乐时必须完整传入九个字段：`url`、`uuid`、`cover`、`title`、`artist`、`duration`、`selection`、`music_volume` 和 `original_sound_volume`。
- `extra.music.url`、`uuid`、`cover`、`title`、`artist` 和 `duration` 必须直接使用本次音乐查询结果中的原值，不要手工拼接、截断或只保留 UUID。
- `extra.music.selection` 支持 `none`、`trending_clip` 和 `full_track`；非 `none` 时必须提供完整音乐对象。
- `extra.music.music_volume` 为背景音乐音量整数值，应显式传入；示例值为 `50`。
- `extra.music.original_sound_volume` 为视频原声音量整数值，应显式传入；仅播放所选音乐时示例值为 `0`。
- 仅支持一个视频附件；视频最大 500 MB，具体上限以服务端配置和 TikTok Shop 平台限制为准。
- `status = 1` 且不传 `scheduled_at` 表示立即提交发布。

**响应示例**

```json
{
  "code": 0,
  "message": "提交成功",
  "data": {"id": 183308},
  "request_id": "018f7f35-7c9a-7b82-a0f2-6a06b0b7d301"
}
```

响应中的 `data.id` 是 SocialEcho 发布记录 ID。HTTP `200` 且业务 `code = 0` 表示任务已成功提交，不代表 TikTok Shop 已完成最终发布。平台发布、视频处理和审核均为异步流程。

TikTok Shop 发布接口状态如下：

| HTTP 状态 | 业务码 | 场景 |
|---|---:|---|
| 200 | `0` | 发布任务已成功提交 |
| 403 | `40300` | `status = 0` 时团队没有草稿权限 |
| 404 | `40400` | 团队、账号或账号关联资源不存在，或账号不属于当前团队 |
| 422 | `42200` | 字段校验、附件、商品、音乐、TikTok Shop 发布规则、业务前置条件或发布流程中被归类为可处理的运行时失败 |
| 500 | `50000` | 其他未预期的服务端异常 |

发布接口在创建记录后才提交异步任务，因此提交阶段返回 HTTP `422` 或 `500` 时，不保证发布记录一定未创建。调用方不要直接重复提交；应先保存 `request_id`，通过贴文列表或后台记录确认是否已生成对应发布记录，再决定是否重试，避免重复发布。

---

## 6. 对接建议

1. 先获取账号列表，再将 `account_id` 传给贴文、报表、素材查询和发布接口，避免传入不属于当前团队的账号。
2. 涉及分页接口时，统一循环 `page`，并在 `total` / `per_page` 达到末页后停止。
3. 在 n8n、Zapier、Dify 等工作流平台中，将失败分支区分为鉴权失败、参数失败、限流失败和上游平台失败。
4. 建议记录请求时间、接口名、HTTP 状态码、业务 `code`、`request_id` 与关键请求参数，便于线上排障。
5. 发布类接口应先调用 `GET /v1/upload/url` 完成素材上传，再组装 `attachments`。
6. TikTok Shop 发布应始终使用商品列表接口返回的完整商品对象，不要手工拼接或长期缓存商品状态。
7. 趋势音乐可能随国家、分类和时间范围变化，建议在发布前实时查询。
8. 所有自动化请求需保持在单个 API Key 每分钟 120 次以内，并对 429、502 和网络超时配置指数退避。

---

## 7. 常见问题（FAQ）

**Q1：如何判断接口调用成功？**

A：仅当 HTTP 状态码为 `2xx` 且 JSON 中 `code = 0` 时才算成功。HTTP `4xx/5xx` 均为失败，但仍应解析响应体获取 `code`、`error`、`data` 和 `request_id`。若收到 HTTP `2xx` 但 `code` 非零，应按契约异常处理并记录 `request_id`。

**Q2：`account_ids` 在 QueryString 中怎么传？**

A：重复使用带方括号的参数键，例如 `account_ids[]=163956&account_ids[]=163955&account_ids[]=28`。

**Q3：如何避免触发 429？**

A：控制单个 API Key 不超过 120 req/min，并配置节流与指数退避。优先按 `Retry-After` 等待；商品同步冷却若未返回该响应头，则按 `data.next_allowed_at` 或响应消息等待。

**Q4：如何确认账号是否为 TikTok Shop？**

A：调用 `/v1/account`，检查返回项的 `app.title` 是否为 `TikTokShop`，并确认 `status.value = 1`。

**Q5：商品关键词查询不到结果怎么办？**

A：部分商品标题为英文。可改用英文关键词，或不传 `keyword` 获取全部商品后再筛选。

**Q6：发布接口成功后，为什么 TikTok 主页暂时看不到新视频？**

A：发布接口成功只表示任务已提交。视频上传、TikTok Shop 发布及平台审核为异步流程，可能需要等待。请保存响应中的发布记录 ID 和 `request_id` 用于排查。

**Q7：上传接口中的 `upload_url` 和 `public_url` 有什么区别？**

A：`upload_url` 是有时效性的 OSS 预签名上传地址，仅用于上传文件；`public_url` 是发布接口 `attachments[].url` 应使用的文件地址。

**Q8：音乐接口为什么没有返回音量字段？**

A：趋势音乐接口返回六个音乐素材字段：`url`、`uuid`、`cover`、`title`、`artist` 和 `duration`。调用方选择音乐后，必须将这六个字段原值完整复制到 `extra.music`，再补充 `selection`、`music_volume`、`original_sound_volume` 三个发布控制字段，共九个字段。TikTok Shop 视频只播放所选音乐时，可使用 `music_volume = 50`、`original_sound_volume = 0`。

---

本文档结构与 SocialEcho 帮助中心原文对齐。若文档示例与服务端实际返回存在差异，以服务端响应及最新导出的 OpenAPI 定义为准。
