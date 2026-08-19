---
name: hosting-deploy-nodejs-app
description: >-
  Deploy a Node.js application (needs a build step) to a Hostinger "hosting" website via
  public-api, using standalone MCP tools/plain curl instead of a filesystem-driven deploy tool.
  Use when asked to deploy/build a Node.js/JS app on hosting (not Agency Plan), or replicate what
  public-api-generator's hosting_deployJsApplication tool does step by step.
---

# Deploy a Node.js app to hosting

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token and the target `domain`. The one upload step has no tool wrapper: it hits the file-storage
host directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`hosting_generateUploadURLV1` (not the Bearer token), so it's always plain curl. Archive must
contain only application source (exclude `node_modules/` and any build output — the build step
runs install automatically).

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `hosting_listWebsitesV1` | query `domain={domain}` → resolve `username` |
| 2 | `hosting_generateUploadURLV1` | body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }` |
| 3 | *(no tool — plain curl)* | TUS upload of the archive |
| 4 | `hosting_getNode_jsBuildSettingsFromArchiveV1` | query `archive_path={file}` — optional, auto-detects build settings |
| 5 | `hosting_startNode_jsBuildV1` | starts the build — **destructive** |

## Steps

1. **Resolve `username`**: call `hosting_listWebsitesV1` with `domain={domain}` → `data[0].username`.
2. **Get upload credentials**: call `hosting_generateUploadURLV1` with body `{"username","domain"}` → `{ url, auth_key, rest_auth_key }`.
3. **Upload the archive via TUS** (plain curl — no MCP tool for this) to its bare filename (no subdirectory):
   ```
   FILE=app.zip
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
4. **Auto-detect build settings** (optional but recommended): call `hosting_getNode_jsBuildSettingsFromArchiveV1`
   with `archive_path=app.zip` → returns `app_type`, `node_version`, `root_directory`,
   `output_directory`, `build_script`, `entry_file`, `package_manager`. Forward these as-is into
   step 5 (override any field the caller wants different first).
5. **Start the build**: call `hosting_startNode_jsBuildV1` with body:
   ```json
   {
     "node_version": 20,
     "app_type": "...",
     "root_directory": "...",
     "output_directory": "...",
     "build_script": "...",
     "source_type": "archive",
     "source_options": { "archive_path": "app.zip" }
   }
   ```
   `node_version` must be one of `18`/`20`/`22`/`24` (default `20` if step 4 didn't return one). `entry_file` is required only when `app_type` is `express`. Response includes a build `uuid` — poll `hosting_listNodeJSBuildsV1` or `hosting_getNodeJSBuildLogsV1` for progress.

## Verify

The build is asynchronous — the previous step only queues it.

1. Poll `hosting_listNodeJSBuildsV1` until the build reports a finished state. Back
   off between polls: builds take minutes, not seconds.
2. If it failed, pull `hosting_getNodeJSBuildLogsV1` for that build `uuid`, fix the
   cause, and redeploy. Do not report success on a queued build.
3. Once it succeeds, confirm the app actually serves:
   ```
   curl -s -o /dev/null -w "%{http_code}\n" https://{domain}/
   curl -s https://{domain}/ | grep -o "SOME_TEXT_YOU_ACTUALLY_DEPLOYED"
   ```

A `200` alone is not proof — grep for a string you know is in the build output.

## One-step alternative

`hosting_createNodeJSBuildFromArchiveV1` uploads the archive as multipart form data directly in
the request and starts the build in one call — skips steps 2–4 entirely if the caller can send
the raw archive bytes in the request body. Max archive size 50MB.

## Warning

**Destructive.** On success, the build result overwrites the entire website root (`public_html`,
except subdomain directories and `.htaccess`) — cannot be undone. Confirm intent before step 5
(or before calling the one-step alternative).

## When it's the wrong tool

- Site has no build step (plain static files) → use **hosting-deploy-static-site** instead.
- Site is WordPress → use **hosting-deploy-wordpress-site** instead.
