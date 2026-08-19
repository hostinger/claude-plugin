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

Plus seven **deployment skills** that teach the agent how to get your files onto
Hostinger without a local MCP server:

| Skill | Use for |
|---|---|
| `hosting-deploy-static-site` | Pre-built static site (no build step) |
| `hosting-deploy-nodejs-app` | Node.js app — built on Hostinger |
| `hosting-deploy-wordpress-site` | Import a WordPress site (archive + SQL dump) |
| `hosting-deploy-wordpress-plugin` | Deploy a WordPress plugin |
| `hosting-deploy-wordpress-theme` | Deploy a WordPress theme |
| `agency-hosting-deploy-static-site` | Agency Plan (h5g) static / node-static site |
| `agency-hosting-deploy-php-site` | Agency Plan (h5g) PHP app, extracted as-is |

The agent picks the right one from your request — you don't invoke them by name.

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

1. **Get a short-lived upload URL** — `hosting_generateUploadURLV1` (or the
   `agency-hosting` equivalent) returns a URL plus `auth_key` / `rest_auth_key`.
2. **Upload the archive over TUS** — plain `curl`, authenticated with those keys.
   This is the one step with no tool wrapper, because it talks to the file-storage
   host directly.
3. **Trigger the deploy or build** — an MCP tool call referencing the uploaded
   filename.

The skills document each variant of this flow, including the destructive steps
that overwrite a site's contents.

> **Deployment needs a shell.** Steps 2 requires the agent to run `curl`, so
> deploys work wherever the agent has shell access (Claude Code, and the Code tab
> of the desktop app). Everything else — domains, DNS, VPS, WordPress
> management, email — works everywhere.

## Links

- [Hostinger API Documentation](https://developers.hostinger.com)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=hostinger.hostinger-connector)
- [Report Issues](https://github.com/hostinger/claude-plugin/issues)
