---
name: social-media-autopilot
description: Call and troubleshoot the SocialEcho external OpenAPI with a Team API Key. Use for team and account queries, authorization links, articles, reports, OSS upload URLs, Reddit communities, Pinterest boards, TikTok Shop products and product sync, TikTok Shop music genres and trending music, or cross-platform publishing.
---

# Social Media Autopilot

Use `socialecho.js` for SocialEcho OpenAPI calls. Keep the Team API Key only in process memory. Never print, persist, or place it in URLs, files, logs, or final responses.

## Core workflow

1. Run `team` first to validate the key and team context.
2. Run `accounts --type 1`, paginate through `body.meta.last_page` when needed, and select account IDs from current results.
3. Check the account platform and `status.value` before calling platform-specific endpoints. TikTok Shop uses `app.id = 11`, `app.title = TikTokShop`, and requires `status.value = 1`.
4. Treat success as HTTP `2xx` and JSON `code = 0`. Preserve `request_id` for failures.
5. Retry only network failures and HTTP `429`, `502`, `503`, or `504`. The CLI performs bounded backoff automatically.
6. Keep calls below 120 requests per minute per API key.

All GET parameters use QueryString and GET requests never carry a body. Encode arrays with bracketed keys such as `account_ids[]=41&account_ids[]=42`; CloudFront returns `403` for GET requests with a body.

## Setup and syntax

No package installation is required; use Node.js 18 or newer.

```powershell
node .\socialecho.js team --api-key YOUR_KEY
node .\socialecho.js accounts --api-key YOUR_KEY --page 1 --type 1
node .\socialecho.js articles --api-key YOUR_KEY --page 1 --account-ids 41,42
node .\socialecho.js report --api-key YOUR_KEY --start-date 2026-01-01 --end-date 2026-03-24 --time-type 1 --group day --account-ids 41,42
```

Global options are `--base-url`, `--lang`, `--team-id`, `--timeout-ms`, and `--max-attempts`. Default base URL is `https://api.socialecho.net`; use `https://api-dev.socialecho.net` only when the user explicitly targets development.

## Platform and TikTok Shop queries

```powershell
node .\socialecho.js oauth-links --api-key YOUR_KEY
node .\socialecho.js upload-url --api-key YOUR_KEY --content-type video/mp4 --title product-video.mp4
node .\socialecho.js reddit-communities --api-key YOUR_KEY --account-id 41
node .\socialecho.js pinterest-boards --api-key YOUR_KEY --account-id 42
node .\socialecho.js tiktokshop-products --api-key YOUR_KEY --account-id 43 --page 1 --per-page 20
node .\socialecho.js tiktokshop-music-genres --api-key YOUR_KEY
node .\socialecho.js tiktokshop-music-trending --api-key YOUR_KEY --account-id 43 --country-code US --genre BGM --date-range 7DAY
```

For the endpoint matrix and operational rules, read [references/openapi.md](references/openapi.md). When exact examples, field wording, or edge-case details are required, read the complete supplied document at [references/openapi-source.md](references/openapi-source.md).

## Selected music payload

When publishing selected TikTok or TikTok Shop music, copy the complete music item returned by the trending-music endpoint into `extra.music`, then add the publish controls. Do not reduce the object to a UUID or a four-field subset. A selected music object must contain all nine fields:

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

Preserve `url`, `uuid`, `cover`, `title`, `artist`, and `duration` exactly as returned. Set `selection` to `trending_clip` or `full_track`, and explicitly send integer `music_volume` and `original_sound_volume` values from 0 to 100. Use `selection: "none"` when no music is selected. The bundled CLI rejects incomplete selected-music payloads before making a publish request.

## Live mutations

Do not sync products or publish unless the user explicitly authorizes that live action. These commands require `--execute`:

```powershell
node .\socialecho.js tiktokshop-product-sync --api-key YOUR_KEY --account-id 43 --execute
node .\socialecho.js publish-article --api-key YOUR_KEY --payload-file .\publish-payload.json --execute
```

Publishing success means only that SocialEcho accepted the asynchronous task. It does not prove final platform publication. If publish returns HTTP `422` or `500`, preserve `request_id` and check existing article or backend records before retrying, because a publish record may already exist.

## Output and failures

The CLI prints one JSON object. Inspect `ok`, `status`, `code`, `request_id`, and `body`. Report only relevant account or content data and failure evidence; never echo authorization URLs containing state unless the user specifically needs the URL.

- `400/405/422`: correct method or parameters.
- `401`: replace the missing, invalid, or expired Team API Key.
- `403`: if the response is CloudFront HTML, remove the GET body and use QueryString; otherwise correct permissions. Do not retry unchanged.
- `404`: refresh the team-owned account or resource ID.
- `429`: honor `Retry-After` or `data.next_allowed_at`.
- `500`: preserve `request_id` and contact SocialEcho support.
- `502/503/504`: retry with bounded backoff.
