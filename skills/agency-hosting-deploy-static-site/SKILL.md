---
name: agency-hosting-deploy-static-site
description: >-
  Deploy a node-static Agency Plan website (Node.js-built static site, or a plain simple static
  site) from an archive via public-api, using standalone MCP tools/plain curl instead of a
  filesystem-driven deploy tool. Use when asked to deploy/build a static or node-static app on
  an Agency Plan / h5g / agency-hosting website.
---

# Deploy a node-static app to an Agency Plan website

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token and the target `domain`. The upload step has no tool wrapper: it hits the file-storage host
directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`agency-hosting_generateUploadURLV1` (not the Bearer token), so it's always plain curl.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `agency-hosting_listDomainsV1` | paginate, match `fqdn` → resolve `website_uid` |
| 2 | `agency-hosting_generateUploadURLV1` | no body → `{ url, auth_key, rest_auth_key }` |
| 3 | *(no tool — plain curl)* | TUS upload of the archive into a scratch directory |
| 4 | `agency-hosting_buildWebsiteNodeJSAssetsV1` | body `{"archive_path"}` — **destructive** |

## The "random directory" — what it actually is

This flow needs a **scratch upload directory** under `.h5g/` that's unique per deploy, so
concurrent/repeated builds don't collide (unlike the PHP-app flow, which reuses one fixed path).
It has no special meaning server-side — any unique string works. The reference implementation
generates a 12-character random alphanumeric string (`Math.random()`-based, not a UUID); you can
do the same, e.g.:
```
UPLOAD_DIR=".h5g/$(cat /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | head -c 12)"
```
The server deletes this directory automatically after a **successful** build; on failure it's
left in place for debugging.

## Steps

1. **Resolve `website_uid`**: call `agency-hosting_listDomainsV1` with `page=1&per_page=100`
   (paginate until found) → match the entry whose `fqdn` equals `domain`, take its `website_uid`.
2. **Get upload credentials**: call `agency-hosting_generateUploadURLV1` for that `website_uid`
   — no request body — → `{ url, auth_key, rest_auth_key }`.
3. **Upload the archive via TUS** (plain curl — no MCP tool for this) into the scratch directory
   from above, e.g. `${UPLOAD_DIR}/app.zip`:
   ```
   FILE=app.zip
   SIZE=$(wc -c < "$FILE")

   curl -sS -i -X POST "${url}/${UPLOAD_DIR}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0"

   curl -sS -i -X PATCH "${url}/${UPLOAD_DIR}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" \
     -H "Upload-Offset: 0" --data-binary "@${FILE}"
   ```
4. **Trigger build**: call `agency-hosting_buildWebsiteNodeJSAssetsV1` with body:
   ```json
   { "archive_path": ".h5g/AbCdEf012345" }
   ```
   `archive_path` is the **scratch directory** from step 3 (not the filename) — the server scans
   it for the archive to build.

## Verify

```
curl -s -o /dev/null -w "%{http_code}\n" https://{domain}/
curl -s https://{domain}/ | grep -o "SOME_TEXT_YOU_ACTUALLY_DEPLOYED"
```

A `200` alone is not proof — a fresh or failed deploy can still serve a parking
page. Always grep for a string you know is in the files you just deployed. If it
does not match, call `agency-hosting_clearWebsiteCacheV1` and retry once before
reporting failure.

## Warning

**Destructive.** On success, the build result overwrites the website's existing contents and is
deployed to `public_html` — cannot be undone. Confirm intent before step 4.

## When it's the wrong tool

- Site has no build step and should be deployed as-is → use **agency-hosting-deploy-php-site**
  instead (fixed upload path, no scratch directory, no build step).
