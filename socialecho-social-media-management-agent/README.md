## SocialEcho Social Media Management Agent（Dify 工具插件）

**作者：** socialecho-net  
**当前版本（manifest）：** 0.2.0
**类型：** Tool Plugin

与当前 SocialEcho OpenAPI 接口清单对齐。所有 GET 参数使用 QueryString，GET 不携带 body。

### 工具与接口

| 工具 | 方法 | 路径 |
|------|------|------|
| 获取团队信息 | GET | `/v1/team` |
| 账号列表 | GET | `/v1/account` |
| OAuth 授权链接 | GET | `/v1/oauth/links` |
| 贴文列表 | GET | `/v1/article` |
| 数据报表 | GET | `/v1/report` |
| 获取 OSS 上传地址 | GET | `/v1/upload/url`（`content_type` 必填，见工具说明） |
| Reddit 社区列表 | GET | `/v1/reddit/communities`（`account_id`） |
| Pinterest 图版列表 | GET | `/v1/pinterest/boards`（`account_id`） |
| 发布贴文 | **POST** | `/v1/publish/article`（`body_json` 为完整 JSON 对象字符串） |
| TikTok Shop 商品 | GET | `/v1/tiktokshop/products` |
| TikTok Shop 商品同步 | POST | `/v1/tiktokshop/products/sync` |
| TikTok Shop 音乐分类 | GET | `/v1/tiktokshop/music/genres` |
| TikTok Shop 趋势音乐 | GET | `/v1/tiktokshop/music/trending` |

### 凭据

- `api_key`：团队 API Key（`se_` 开头）  
- `x_lang`：可选 `zh_CN` / `en`  

### 成功判定

HTTP `2xx` 且 JSON `code` 为 `0`。

### Marketplace 与隐私

- 上架与 PR 流程见 **[`MARKETPLACE.md`](./MARKETPLACE.md)**。  
- 隐私说明见 **[`PRIVACY.md`](./PRIVACY.md)**（`manifest` 中 `privacy` 已引用）。

### 开发

```bash
pip install -r requirements.txt
python -m main
```

### 打 `.difypkg` 包

在插件**上一级**目录执行：

```bash
dify plugin package ./socialecho-social-media-management-agent
```

在**当前工作目录**生成 `socialecho-social-media-management-agent` 对应的 **`.difypkg`**，用于 [dify-plugins](https://github.com/langgenius/dify-plugins) PR 或本地上传安装。

> **ClawHub** 的 Node 技能包在仓库 `socialecho-skills` 目录，与 `.difypkg` 无关。
