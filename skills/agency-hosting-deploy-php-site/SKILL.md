---
name: agency-hosting-deploy-php-site
description: >-
  Deploy a PHP (or other no-build) Agency Plan website from an archive via public-api, using
  standalone MCP tools/plain curl instead of a filesystem-driven deploy tool. Use when asked to
  deploy a PHP app to an Agency Plan / h5g / agency-hosting website, or replicate what
  public-api-generator's agency-hosting_deployPhpApplication tool does step by step.
---

# Deploy a PHP app to an Agency Plan website

No filesystem access needed. Call the public-api MCP tools by name below — these need a Bearer
token and the target `domain`. The upload step has no tool wrapper: it hits the file-storage host
directly via TUS, authenticated with the `auth_key`/`rest_auth_key` from
`agency-hosting_generateUploadURLV1` (not the Bearer token), so it's always plain curl.

## Tools used, in order

| # | Tool | Notes |
|---|------|-------|
| 1 | `agency-hosting_listDomainsV1` | paginate, match `fqdn` → resolve `website_uid` |
| 2 | `agency-hosting_generateUploadURLV1` | no body → `{ url, auth_key, rest_auth_key }` |
| 3 | *(no tool — plain curl)* | TUS upload of the archive |
| 4 | `agency-hosting_importWebsiteFromArchiveV1` | body `{"archive_name"}` — **destructive** |

## Steps

1. **Resolve `website_uid`**: call `agency-hosting_listDomainsV1` with `page=1&per_page=100`
   (paginate until found) → match the entry whose `fqdn` equals `domain`, take its `website_uid`.
2. **Get upload credentials**: call `agency-hosting_generateUploadURLV1` for that `website_uid`
   — no request body — → `{ url, auth_key, rest_auth_key }`.
3. **Upload the archive via TUS** (plain curl — no MCP tool for this) to a **fixed path under
   `.h5g/`** — no random directory for this flow, just `.h5g/{bare filename}` (e.g. `.h5g/app.zip`):
   ```
   FILE=app.zip
   SIZE=$(wc -c < "$FILE")

   curl -sS -i -X POST "${url}/.h5g/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Upload-Length: ${SIZE}" -H "Upload-Offset: 0"

   curl -sS -i -X PATCH "${url}/.h5g/${FILE}?override=true" \
     -H "X-Auth: ${auth_key}" -H "X-Auth-Rest: ${rest_auth_key}" \
     -H "Tus-Resumable: 1.0.0" -H "Content-Type: application/offset+octet-stream" \
     -H "Upload-Offset: 0" --data-binary "@${FILE}"
   ```
   `?override=true` means re-deploying the same domain overwrites this same path rather than
   accumulating files — no cleanup step needed after a successful import.
4. **Trigger import**: call `agency-hosting_importWebsiteFromArchiveV1` with body:
   ```json
   { "archive_name": "app.zip" }
   ```
   `archive_name` must be a **bare filename** (no `/` or `\`) ending in `.zip`, `.tar`, `.tar.gz`,
   or `.tgz` — do not pass the `.h5g/` prefix here, the server already knows where it was uploaded.

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

**Destructive.** Website contents are overwritten by the archive contents — cannot be undone.
Confirm intent before step 4.

## When it's the wrong tool

- Site needs a Node.js build step → use **agency-hosting-deploy-static-site** instead.
