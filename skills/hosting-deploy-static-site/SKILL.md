---
name: hosting-deploy-static-site
description: >-
  Deploy a pre-built static site (HTML/CSS/JS, no build step) to a Hostinger "hosting" website
  via public-api, using standalone MCP tools/plain curl instead of a filesystem-driven deploy
  tool. Use when asked to deploy/upload a static site to hosting (not Agency Plan), or replicate
  what public-api-generator's hosting_deployStaticWebsite tool does step by step.
---

# Deploy a static site to hosting

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token and the target `domain`. The one upload step has no tool wrapper: it hits the file-storage
host directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`hosting_generateUploadURLV1` (not the Bearer token), so it's always plain curl.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `hosting_listWebsitesV1` | query `domain={domain}` → resolve `username` |
| 2 | `hosting_generateUploadURLV1` | body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` |
| 3 | *(no tool — plain curl)* | TUS upload of the archive |
| 4 | `hosting_deployStaticSiteArchiveV1` | body `{"archive_path"}` — **destructive** |

## Steps

1. **Resolve `username`**: call `hosting_listWebsitesV1` with `domain={domain}` → `data[0].username`.
2. **Get upload credentials**: call `hosting_generateUploadURLV1` with body `{"username": "...", "domain": "..."}` → `{ url, auth_key, rest_auth_key }`.
3. **Upload the archive via TUS** (plain curl — no MCP tool for this), using the archive's bare filename as `relative_file_path` (e.g. `site.zip` — no subdirectory):
   ```
   FILE=site.zip
   SIZE=$(wc -c < "$FILE")

   curl -sS -i -X POST "${url}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0"
   # -> 201 Created

   curl -sS -i -X PATCH "${url}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" \
     -H "Upload-Offset: 0" --data-binary "@${FILE}"
   # -> 204, Upload-Offset response header == SIZE means done
   ```
   `?override=true` means a re-upload of the same path replaces it — safe to retry.
4. **Trigger deploy**: call `hosting_deployStaticSiteArchiveV1` with body `{"archive_path": "site.zip"}` (bare filename from step 3, no other fields accepted).

## Verify

```
curl -s -o /dev/null -w "%{http_code}\n" https://{domain}/
curl -s https://{domain}/ | grep -o "SOME_TEXT_YOU_ACTUALLY_DEPLOYED"
```

A `200` alone is not proof — a fresh or failed deploy can still serve a parking
page. Always grep for a string you know is in the files you just deployed. If it
does not match, call `hosting_clearWebsiteCacheV1` and retry once before
reporting failure.

## Warning

**Destructive.** Deploy wipes the entire website root (except subdomain directories) before
extracting the new archive — cannot be undone. Confirm intent before step 4.

## When it's the wrong tool

- Site has a `package.json` / needs a build step → use the **hosting-deploy-nodejs-app** skill instead.
- Site is WordPress → use **hosting-deploy-wordpress-site** instead.
