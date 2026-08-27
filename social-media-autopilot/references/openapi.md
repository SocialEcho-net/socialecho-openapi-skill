# SocialEcho OpenAPI Reference

Source: [openapi-source.md](openapi-source.md), updated 2026-08-27.

## Contents

- [Transport and response contract](#transport-and-response-contract)
- [Endpoint matrix](#endpoint-matrix)
- [TikTok Shop music](#tiktok-shop-music)
- [TikTok Shop publishing](#tiktok-shop-publishing)
- [Error handling](#error-handling)

## Transport and response contract

- Base URL: `https://api.socialecho.net`.
- Authentication: `Authorization: Bearer <Team API Key>`.
- Optional locale header: `X-Lang: zh_CN` or `en`.
- Rate limit: 120 requests per minute per API key.
- All GET endpoints use QueryString parameters and must not carry a request body.
- Encode array parameters with bracketed keys, for example `account_ids[]=41&account_ids[]=42`.
- CloudFront returns HTML `403 Bad request` for GET requests with a body; do not retry that request unchanged.
- Success requires HTTP `2xx` and JSON `code = 0`.
- Parse JSON on non-2xx responses and retain `request_id` or response header `X-Request-Id`.
- Pagination metadata is returned in `meta`.

## Endpoint matrix

| Command | Method and path | Parameters |
|---|---|---|
| `team` | `GET /v1/team` | none |
| `accounts` | `GET /v1/account` | `page?`, `type?` (`1` authorized, `2` competitor) |
| `oauth-links` | `GET /v1/oauth/links` | none |
| `articles` | `GET /v1/article` | `page?`, `account_ids?: integer[]` |
| `report` | `GET /v1/report` | `start_date`, `end_date`, `time_type`; `group?`, `account_ids?` |
| `upload-url` | `GET /v1/upload/url` | `content_type`, `title?` |
| `reddit-communities` | `GET /v1/reddit/communities` | `account_id` |
| `pinterest-boards` | `GET /v1/pinterest/boards` | `account_id` |
| `tiktokshop-products` | `GET /v1/tiktokshop/products` | `account_id`; `page?`, `per_page?`, `keyword?` |
| `tiktokshop-product-sync` | `POST /v1/tiktokshop/products/sync` | `account_id` |
| `tiktokshop-music-genres` | `GET /v1/tiktokshop/music/genres` | none |
| `tiktokshop-music-trending` | `GET /v1/tiktokshop/music/trending` | `account_id`; `country_code?`, `genre?`, `date_range?` |
| `publish-article` | `POST /v1/publish/article` | JSON publish payload |

Account list items expose `id`, `title`, `account`, `url`, `app`, `type`, and `status`. A usable TikTok Shop account has `app.id = 11`, `app.title = TikTokShop`, and `status.value = 1`.

Upload `content_type` supports common image types (`jpeg`, `jpg`, `png`, `gif`, `webp`, `bmp`) and video types (`mp4`, `avi`, `mov`, `wmv`, `flv`, `webm`, `mkv`, `3gp`, `quicktime`). Upload the file with the returned method and `upload_url`; pass the returned `public_url` to publishing.

Product list parameters: `per_page` is 1-100, default 20; `keyword` is at most 500 characters. Use products with `status = 1` and preserve the returned `id`, `uuid`, `title`, and `thumb`. Product sync is asynchronous and has an approximately 60-minute per-account cooldown.

## TikTok Shop music

Call `tiktokshop-music-genres` to obtain valid genre values, then call `tiktokshop-music-trending` with a current TikTok Shop account ID.

- `country_code`: two-letter code such as `US`.
- `genre`: a value returned by the genres endpoint, such as `ALL`, `POP`, or `BGM`.
- `date_range`: `1DAY`, `7DAY`, `30DAY`, or `90DAY`.
- Each result includes `uuid`, `title`, `artist`, `url`, `cover`, and `duration` in seconds.
- `selection`, `music_volume`, and `original_sound_volume` are publish controls, not music-query response fields.
- For publishing selected music, copy all six returned fields unchanged and add all three controls. `extra.music` must contain `url`, `uuid`, `cover`, `title`, `artist`, `duration`, `selection`, `music_volume`, and `original_sound_volume`.

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

## TikTok Shop publishing

Use this order: select a healthy TikTok Shop account, fetch a current product, optionally fetch current music, obtain an OSS upload URL and upload one video, then publish using the upload response's `public_url`.

Required common fields are `account_id`, `type`, `status`, `comment`, `extra`, and `attachments`. `scheduled_at` is optional; `content` depends on platform. Common `type` values include Facebook/Instagram `reels|post|stories`, YouTube `shorts|video`, X `short_post|long_post`, TikTok `video|photo`, TikTok Shop `video`, Pinterest/LinkedIn `post`, and Reddit `text|link|media`.

TikTok Shop-specific rules:

- `type` must be `video`.
- `content` is required and at most 2200 UTF-16 code units.
- `extra.title` is required, at most 30 characters, and supports only Unicode letters, numbers, and spaces.
- `extra.product` must contain the current product API's `id`, `uuid`, `title`, and `thumb` unchanged.
- `extra.music` is optional. Its `selection` is `none`, `trending_clip`, or `full_track`.
- For a non-`none` selection, preserve the current music result's `url`, `uuid`, `cover`, `title`, `artist`, and `duration`, then explicitly send `selection`, integer `music_volume`, and integer `original_sound_volume`. Never publish a selected track with only its UUID.
- An example for selected music only is `music_volume = 50` and `original_sound_volume = 0`.
- Send exactly one video attachment. The documented maximum is 500 MB, subject to current server and TikTok Shop limits.
- `status = 1` without `scheduled_at` submits immediately.

HTTP `200` with `code = 0` means the asynchronous task was submitted, not that TikTok Shop published it. On HTTP `422` or `500`, a SocialEcho record may already exist; check articles or the backend record before retrying to prevent duplicate publication.

## Error handling

| HTTP | Standard code | Action |
|---:|---:|---|
| 400 | `40000` | Correct request syntax or base parameters. |
| 401 | `40100` | Correct the Team API Key. |
| 403 | `40300` | Correct permissions; do not retry unchanged. |
| 404 | `40400` | Refresh the team-owned resource ID or authorization. |
| 405 | `40500` | Use the method in the `Allow` header. |
| 409 | `40900` | Refresh resource state before retrying. |
| 413 | `41300` | Reduce payload or file size. |
| 422 | `42200` | Correct validation or platform-specific fields using `data`. |
| 429 | `42900` | Honor `Retry-After` or `data.next_allowed_at`. |
| 500 | `50000` | Retain `request_id` and contact support. |
| 502 | `50200` | Retry an upstream platform failure with backoff. |
| 503/504 | `50300`/`50400` | Retry service unavailability or timeout with backoff. |

Automatically retry only network errors and HTTP `429`, `502`, `503`, or `504`. Do not automatically retry validation, authorization, permission, not-found, conflict, or payload errors.
