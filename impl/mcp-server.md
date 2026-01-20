# MCP Server Implementation

**Spec:** N/A (integration layer, derived from CLAUDE.md)
**Status:** Pending
**Last Updated:** 2026-01-20

---

## Dependencies

- ⏳ zoom-auth (pending)
- ⏳ list-recordings (pending)
- ⏳ get-recording (pending)

---

## Overview

Implement the MCP server entry point that wires together authentication, client, and tools. This is the final integration layer.

---

## Tasks

### Priority 1: Server Entry Point

#### P1.1: Create MCP server with stdio transport

- [ ] Implement main entry point
  - **File:** `src/index.ts`
  - **Refs:** CLAUDE.md, @modelcontextprotocol/sdk docs
  - **Complexity:** medium
  - **Dependencies:** All previous features
  - **Details:**
    - Import `Server` from `@modelcontextprotocol/sdk/server`
    - Import `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio`
    - Create server with name `"mcp-zoom-recordings"` and version from package.json
    - Initialize ZoomAuth with config from `loadZoomConfig()`
    - Initialize ZoomClient with ZoomAuth instance
    - Wire up recording tools

#### P1.2: Register tools with server

- [ ] Connect tools to MCP server
  - **File:** `src/index.ts`
  - **Refs:** @modelcontextprotocol/sdk patterns
  - **Complexity:** medium
  - **Dependencies:** P1.1
  - **Details:**
    - Use `server.setRequestHandler(ListToolsRequestSchema, ...)`
    - Return array of tool definitions
    - Use `server.setRequestHandler(CallToolRequestSchema, ...)`
    - Route tool calls to appropriate handlers
    - Handle errors gracefully with MCP error responses

#### P1.3: Add graceful shutdown

- [ ] Handle process signals for clean shutdown
  - **File:** `src/index.ts`
  - **Complexity:** low
  - **Dependencies:** P1.1
  - **Details:**
    - Listen for SIGINT and SIGTERM
    - Close server transport gracefully
    - Exit with appropriate code

---

## Acceptance Criteria

- [ ] `bun run dev` starts the MCP server
- [ ] Server responds to `tools/list` request
- [ ] Server responds to `tools/call` for `list_recordings`
- [ ] Server responds to `tools/call` for `get_recording`
- [ ] Errors are returned in MCP-compliant format
- [ ] Server shuts down cleanly on SIGINT/SIGTERM
