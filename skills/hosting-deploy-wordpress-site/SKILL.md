---
name: hosting-deploy-wordpress-site
description: >-
  Import a full WordPress website (archive + database dump) into a Hostinger "hosting" website
  via public-api, using standalone MCP tools/plain curl instead of a filesystem-driven deploy
  tool. Use when asked to import/restore a whole WordPress site on hosting (not Agency Plan), or
  replicate what public-api-generator's hosting_importWordpressWebsite tool does step by step.
---

# Import a WordPress site to hosting

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token and the target `domain`. Needs two local files: a site archive (zip/tar/tar.gz/tgz) and a
`.sql` database dump. The upload steps have no tool wrapper: they hit the file-storage host
directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`hosting_generateUploadURLV1` (not the Bearer token), so they're always plain curl.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `hosting_listWebsitesV1` | query `domain={domain}` → resolve `username` |
| 2 | `hosting_generateUploadURLV1` | body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` (reused for both uploads) |
| 3 | *(no tool — plain curl)* | TUS upload of the archive AND the `.sql` dump (two separate sequences) |
| 4 | `hosting_importWordPressWebsiteV1` | body `{"archive_path","sql_path"}` — **destructive** |

## Steps

1. **Resolve `username`**: call `hosting_listWebsitesV1` with `domain={domain}` → `data[0].username`.
2. **Get upload credentials once**: call `hosting_generateUploadURLV1` with body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` — reuse for both uploads below.
3. **Upload the archive via TUS** (plain curl — no MCP tool for this) to its bare filename, e.g. `site.zip`:
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
4. **Upload the database dump via TUS** the same way, to its bare filename (e.g. `dump.sql`) — a
   second, independent create-POST + PATCH sequence using the same credentials from step 2:
   ```
   FILE=dump.sql
   SIZE=$(wc -c < "$FILE")

   curl -sS -i -X POST "${url}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0"

   curl -sS -i -X PATCH "${url}/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" \
     -H "Upload-Offset: 0" --data-binary "@${FILE}"
   ```
5. **Trigger import**: call `hosting_importWordPressWebsiteV1` with body:
   ```json
   { "archive_path": "site.zip", "sql_path": "dump.sql" }
   ```
   (bare filenames from steps 3/4, no other fields accepted).

## Verify

```
curl -s -o /dev/null -w "%{http_code}\n" https://{domain}/
curl -s https://{domain}/ | grep -o "SOME_TEXT_YOU_ACTUALLY_DEPLOYED"
```

A `200` alone is not proof — a fresh or failed deploy can still serve a parking
page. Always grep for a string you know is in the files you just deployed. If it
does not match, call `hosting_clearWebsiteCacheV1` and retry once before
reporting failure.

## Before you import

The website should be empty first (hPanel normally checks this and blocks non-empty imports).
That pre-check has no public-api tool — if the target domain already has content, clear it via
hPanel first, or accept that this import will overwrite whatever's there (see warning below).

## Warning

**Destructive.** Existing website contents are moved out of the live web root before the
imported WordPress core is written in — functionally irreversible via the API. Confirm intent
before step 5.

## When it's the wrong tool

- Just deploying a plugin or theme into an existing WP site → use **hosting-deploy-wordpress-plugin**
  or **hosting-deploy-wordpress-theme** instead (those don't touch the rest of the site).
