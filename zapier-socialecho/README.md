# SocialEcho Zapier CLI Integration

This directory contains a full Zapier CLI integration for all SocialEcho OpenAPI endpoints currently present in `../openapi.json`.

## Included Actions

- `get_team` -> `GET /v1/team`
- `list_accounts` -> `GET /v1/account`
- `get_oauth_links` -> `GET /v1/oauth/links`
- `list_articles` -> `GET /v1/article`
- `get_report` -> `GET /v1/report`
- `get_upload_url` -> `GET /v1/upload/url`
- `list_reddit_communities` -> `GET /v1/reddit/communities`
- `list_pinterest_boards` -> `GET /v1/pinterest/boards`
- `publish_article` -> `POST /v1/publish/article`
- `list_tiktokshop_products` -> `GET /v1/tiktokshop/products`
- `sync_tiktokshop_products` -> `POST /v1/tiktokshop/products/sync`
- `list_tiktokshop_music_genres` -> `GET /v1/tiktokshop/music/genres`
- `list_tiktokshop_trending_music` -> `GET /v1/tiktokshop/music/trending`

All GET parameters use QueryString; GET requests never carry a body. Selected music requires all nine `extra.music` fields.

## Install

```bash
npm install
```

## Validate

```bash
npm run check
npm run validate
```

## Auth

Use `team_api_key` (SocialEcho Team API key, starts with `se_`).

Optional auth fields:

- `base_url` (default: `https://api.socialecho.net`)
- `lang` (default: `zh_CN`)

## Local test (example)

```bash
zapier test
```

## Push to Zapier

```bash
zapier login
zapier register "SocialEcho"
zapier push
```

Then open the integration in Zapier Platform and continue testing/publishing.
