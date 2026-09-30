# Hostinger Plugin for Claude Code

Deploy, manage and monitor your Hostinger services directly from Claude Code.

Runs as a **remote MCP server** — there is nothing to install on your machine. No
Node.js, no npm, no local server process.

## What's included

A single remote Hostinger MCP server at `https://mcp.hostinger.com`, covering:

| Service | Description |
|---|---|
| Websites | Deploy websites, manage hosting plans, SSH keys, build logs |
| Domains & DNS | Search, register, manage domain portfolio, DNS records and snapshots |
| Ecommerce | Online stores, product catalogs, ecommerce tools |
| Email Marketing | Contacts, contact groups, segments, profiles |
| Email | Mailboxes and email service management |
| WordPress | WordPress site management |
| Subscriptions & Payments | Subscriptions, payment methods, catalog, orders |
| VPS | Virtual servers, firewalls, snapshots, monitoring |

Plus seven **web hosting skills** for Shared, Cloud and Agency plans:

| Skill | Use for |
|---|---|
| `troubleshoot-website` | A site that is down, slow, erroring, insecure or failing to build — cause and fix |
| `connect-domain` | Attach a domain, point DNS without losing email records, install SSL |
| `deploy-to-hosting` | Deploy static sites, Node.js apps, PHP apps, WordPress plugins and themes; Git auto-deploy, environment variables, databases |
| `maintain-wordpress` | Updates and vulnerability checks across one or all WordPress sites |
| `audit-hosting` | Read-only review of the whole hosting account with a prioritised to-do list |
| `migrate-to-hosting` | Move a site from another host, tested before DNS moves |
| `hostinger-headless` | Build a new site from a prompt, optionally with a store or a WordPress backend |

The agent picks the right one from your request; you can also name a skill. The
skills come from [hostinger/api-mcp-server](https://github.com/hostinger/api-mcp-server)
and are synced into `skills/` with `node scripts/sync-skills.mjs` — change them
upstream, not here.

## Installation

```bash
/plugin install hostinger@claude-plugins-official
```

## Authentication

On first use, the MCP server opens your browser for OAuth sign-in. No API token
needed.

Alternatively, set an API token from [hPanel](https://hpanel.hostinger.com/api):

```bash
export HOSTINGER_API_TOKEN="your-token-here"
```

## Examples

```
> Deploy my static site to Hostinger
> Deploy this Next.js app to example.com
> List all my domains
> Show VPS server metrics for the last 24 hours
> Create an A record pointing example.com to 1.2.3.4
> What hosting plans do I have?
```

## How deployment works

The remote server can't read files off your machine, so deploys run in three
stages, all driven by the agent:

1. **Get a short-lived upload URL** — `hosting_files_generate-upload-url` (or
   `agency-hosting_files_generate-upload-url`) returns a URL plus `auth_key` /
   `rest_auth_key`.
2. **Upload the archive over TUS** — plain `curl`, authenticated with those keys.
   This is the one step with no tool wrapper, because it talks to the file-storage
   host directly.
3. **Trigger the deploy or build** — an MCP tool call referencing the uploaded
   file, e.g. `hosting_websites_deploy-static-site-archive` or
   `hosting_nodejs_start-build`.

The `deploy-to-hosting` skill documents each variant of this flow, including the
destructive steps that overwrite a site's contents.

> **Deployment requires an agent with shell access**, since the upload step runs
> `curl`. Everything else — domains, DNS, VPS, WordPress management, email —
> works anywhere the plugin is available.

## Links

- [Hostinger API Documentation](https://developers.hostinger.com)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=hostinger.hostinger-connector)
- [Report Issues](https://github.com/hostinger/claude-plugin/issues)
