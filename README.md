# Hostinger Plugin for Claude Code

Deploy, manage and monitor your Hostinger services directly from Claude Code.

## What's included

A single Hostinger MCP server (auto-updates to the latest version) covering:

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

## Installation

```bash
/plugin install hostinger@claude-plugins-official
```

## Authentication

On first use, the MCP server opens your browser for OAuth sign-in. No API token needed.

Alternatively, set an API token from [hPanel](https://hpanel.hostinger.com/api):

```bash
export HOSTINGER_API_TOKEN="your-token-here"
```

## Examples

```
> Deploy my static site to Hostinger
> List all my domains
> Show VPS server metrics for the last 24 hours
> Create an A record pointing example.com to 1.2.3.4
> What hosting plans do I have?
```

## Links

- [Hostinger API Documentation](https://developers.hostinger.com)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=hostinger.hostinger-connector)
- [Report Issues](https://github.com/hostinger/claude-plugin/issues)
