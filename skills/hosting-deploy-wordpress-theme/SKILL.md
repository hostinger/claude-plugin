---
name: hosting-deploy-wordpress-theme
description: >-
  Deploy a WordPress theme (a directory of files, not a single archive) to a Hostinger "hosting"
  WordPress website via public-api, using standalone MCP tools/plain curl instead of a
  filesystem-driven deploy tool. Use when asked to deploy/upload a WP theme.
---

# Deploy a WordPress theme to hosting

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token, the target `domain`, the theme `slug`, and the list of theme files with their paths
relative to the theme's own root directory. The upload steps have no tool wrapper: they hit the
file-storage host directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`hosting_generateUploadURLV1` (not the Bearer token), so they're always plain curl.

Unlike archive-based deploys, **every file is uploaded individually via its own TUS sequence** —
there is no zipping step.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `hosting_listWebsitesV1` | query `domain={domain}` → resolve `username` |
| 2 | `hosting_generateUploadURLV1` | body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` (reused for every file) |
| 3 | *(no tool — plain curl)* | one TUS upload per file |
| 4 | `hosting_deployWordPressThemeV1` | body `{"slug","theme_path","is_activated"}` |

## Steps

1. **Resolve `username`**: call `hosting_listWebsitesV1` with `domain={domain}` → `data[0].username`.
2. **Get upload credentials once**: call `hosting_generateUploadURLV1` with body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` — reuse for every file below.
3. **Pick a unique upload directory** for this deploy: `{slug}-{random}` (any unique suffix).
4. **Upload every theme file via TUS**, one at a time, to
   `wp-content/themes/{slug}-{random}/{file's path relative to the theme root}`:
   ```
   FILE=style.css
   RELATIVE_PATH="wp-content/themes/my-theme-a1b2c3d4/${FILE}"
   SIZE=$(wc -c < "$FILE")

   curl -sS -i -X POST "${url}/${RELATIVE_PATH}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0"
   # -> 201 Created

   curl -sS -i -X PATCH "${url}/${RELATIVE_PATH}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" \
     -H "Upload-Offset: 0" --data-binary "@${FILE}"
   # -> 204, Upload-Offset response header == SIZE means done
   ```
   Repeat for every file in the theme.
5. **Trigger deploy** once all files uploaded successfully: call `hosting_deployWordPressThemeV1`
   with body:
   ```json
   { "username": "...", "domain": "...", "slug": "my-theme", "theme_path": "my-theme-a1b2c3d4", "is_activated": false }
   ```
   `theme_path` is the upload directory name from step 3 (not a full path). `is_activated`
   is optional (default `false`) — set `true` to activate the theme after deploy.

## Verify

Call `hosting_listInstalledWordPressThemesV1` and confirm `{slug}` is listed with the
expected version. If you passed `is_activated: true`, check it is reported active —
a successful upload does not guarantee activation.

## Note

This only overwrites the theme's own directory under `wp-content/themes/` — the rest of the site
is untouched. Overwriting an existing theme of the same slug is expected/intended behavior, not
flagged as destructive.
