# MCP Zoom Recordings

An MCP server that enables Claude to access and manage Zoom cloud recordings.

## Quick Start

```bash
# Install dependencies
bun install

# Set environment variables
export ZOOM_API_KEY=your-client-id
export ZOOM_API_SECRET=your-client-secret
export ZOOM_ACCOUNT_ID=your-account-id

# Run in development
bun run dev

# Build for production
bun run build
```

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── auth/                 # Zoom Server-to-Server OAuth
│   ├── config.ts         # Environment variable loading
│   └── zoom-auth.ts      # Token management
├── clients/
│   └── zoom-client.ts    # Zoom API wrapper
├── tools/
│   └── recordings/       # Recording tools
│       ├── list.ts       # list_recordings
│       └── get.ts        # get_recording
└── types/
    └── recordings.ts     # Type definitions
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_recordings` | List cloud recordings (default: last 7 days) |
| `get_recording` | Get recording details and download URLs |

## Specifications

**IMPORTANT:** Before implementing any feature, consult `specs/README.md`.

- **Assume NOT implemented.** Specs describe intent; code describes reality.
- **Check the codebase first.** Search actual code before concluding.
- **Use specs as guidance.** Follow design patterns in relevant spec.
- **Spec index:** `specs/README.md` lists all specs by category.

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7
- **MCP SDK:** @modelcontextprotocol/sdk ^1.0.4
- **Validation:** Zod ^3.24
- **Linting:** Biome ^2.3

## Authentication

This MCP uses Zoom's Server-to-Server OAuth (not user OAuth). No browser flow required.

1. Create a Server-to-Server OAuth app at [marketplace.zoom.us](https://marketplace.zoom.us)
2. Add scopes: `cloud_recording:read:list_user_recordings:admin`, `cloud_recording:read:list_recording_files:admin`
3. Copy Client ID, Client Secret, and Account ID to environment variables

## Related Projects

- [mcp-google-slides](../mcp-google-slides) - MCP for Google Slides (same patterns)
- [mcp-google-keep](../mcp-google-keep) - MCP for Google Keep (same patterns)

## Development Commands

```bash
bun run dev        # Start with watch mode
bun run build      # Build to dist/
bun run lint       # Run Biome linter
bun run lint:fix   # Fix lint issues
bun run typecheck  # Run TypeScript type checking
bun test           # Run tests
```
