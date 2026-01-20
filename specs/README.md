# MCP Zoom Recordings Specifications

Design documentation for an MCP server that enables Claude to access and manage Zoom cloud recordings.

## Overview

This directory contains specifications for the MCP Zoom Recordings server. Each spec describes the design intent, architecture, and implementation guidance for a specific concern.

**Status Legend:**
- **Planned** - Design complete, not yet implemented
- **In Progress** - Currently being implemented
- **Implemented** - Feature complete and in production

---

## Core Infrastructure

| Spec | Status | Purpose |
|------|--------|---------|
| [zoom-auth.md](./zoom-auth.md) | Planned | Server-to-Server OAuth authentication with Zoom API |

## Recording Tools

| Spec | Status | Purpose |
|------|--------|---------|
| [list-recordings.md](./list-recordings.md) | Planned | List cloud recordings with date filtering |
| [get-recording.md](./get-recording.md) | Planned | Get recording details and download URLs for a meeting |

---

## Using These Specs

### For Implementers

1. **Read the spec first** before writing code
2. **Check existing code** - specs describe intent, code describes reality
3. **Follow the patterns** outlined in each spec's Architecture section
4. **Update status** when implementation begins/completes

### For Reviewers

1. **Compare against spec** during code review
2. **Flag deviations** that aren't documented
3. **Propose spec updates** when implementation reveals better approaches

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project-level AI guidance
