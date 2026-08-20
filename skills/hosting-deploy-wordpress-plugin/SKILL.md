---
name: hosting-deploy-wordpress-plugin
description: >-
  Deploy a WordPress plugin (a directory of files, not a single archive) to a Hostinger
  "hosting" WordPress website via public-api, using standalone MCP tools/plain curl instead of a
  filesystem-driven deploy tool. Use when asked to deploy/upload a WP plugin.
---

# Deploy a WordPress plugin to hosting

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token, the target `domain`, the plugin `slug`, and the list of plugin files with their paths
relative to the plugin's own root directory (e.g. `my-plugin.php`, `includes/helper.php`). The
upload steps have no tool wrapper: they hit the file-storage host directly via TUS, authenticated
with the `auth_key`/`rest_auth_key` from `hosting_generateUploadURLV1` (not the Bearer token), so
they're always plain curl.

Unlike archive-based deploys, **every file is uploaded individually via its own TUS sequence** —
there is no zipping step.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `hosting_listWebsitesV1` | query `domain={domain}` → resolve `username` |
| 2 | `hosting_generateUploadURLV1` | body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` (reused for every file) |
| 3 | *(no tool — plain curl)* | one TUS upload per file |
| 4 | `hosting_deployWordPressPluginV1` | body `{"slug","plugin_path"}` |

## Steps

1. **Resolve `username`**: call `hosting_listWebsitesV1` with `domain={domain}` → `data[0].username`.
2. **Get upload credentials once**: call `hosting_generateUploadURLV1` with body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` — reuse for every file below.
3. **Pick a unique upload directory** for this deploy: `{slug}-{random}` (any unique suffix — an
   8-char random string works, it just needs to not collide with a directory already in use).
4. **Upload every plugin file via TUS**, one at a time, to
   `wp-content/plugins/{slug}-{random}/{file's path relative to the plugin root}`:
   ```
   FILE=includes/helper.php
   RELATIVE_PATH="wp-content/plugins/my-plugin-a1b2c3d4/${FILE}"
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
   Repeat for every file in the plugin.
5. **Trigger deploy** once all files uploaded successfully: call `hosting_deployWordPressPluginV1`
   with body:
   ```json
   { "username": "...", "domain": "...", "slug": "my-plugin", "plugin_path": "my-plugin-a1b2c3d4" }
   ```
   `plugin_path` is the upload directory name from step 3 (not a full path) — the plugin will be
   activated and made available in the WordPress admin panel.

## Verify

Call `hosting_listInstalledWordPressPluginsV1` and confirm `{slug}` is listed and reported
active — this tool always activates the plugin, and a successful upload does not by itself
mean the deploy step succeeded.

## Note

This only overwrites the plugin's own directory under `wp-content/plugins/` — the rest of the
site is untouched. Overwriting an existing plugin of the same slug is expected/intended behavior,
not flagged as destructive.
