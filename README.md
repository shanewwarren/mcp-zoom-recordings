# MCP Zoom Recordings

An MCP (Model Context Protocol) server that enables Claude to access and manage your Zoom cloud recordings.

## Features

- **list_recordings** - List cloud recordings with date filtering (default: last 7 days)
- **get_recording** - Get recording details and download URLs for a specific meeting

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Zoom account with cloud recording enabled
- Zoom Server-to-Server OAuth app

## Setup

### 1. Create a Zoom Server-to-Server OAuth App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** > **Build App**
3. Select **Server-to-Server OAuth** app type
4. Fill in the required information and create the app
5. Note down:
   - **Account ID** (from App Credentials)
   - **Client ID** (from App Credentials)
   - **Client Secret** (from App Credentials)

### 2. Add Required Scopes

In your Zoom app settings, add these scopes:

- `cloud_recording:read:list_user_recordings:admin`
- `cloud_recording:read:list_recording_files:admin`

### 3. Activate the App

Click **Activate your app** to enable it.

### 4. Install Dependencies

```bash
bun install
```

### 5. Build the Server

```bash
bun run build
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zoom-recordings": {
      "command": "node",
      "args": ["/path/to/mcp-zoom-recordings/dist/index.js"],
      "env": {
        "ZOOM_API_KEY": "your-client-id",
        "ZOOM_API_SECRET": "your-client-secret",
        "ZOOM_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

Replace `/path/to/mcp-zoom-recordings` with the actual path to this project.

### Claude Code CLI

```bash
claude mcp add zoom-recordings -e ZOOM_API_KEY=your-client-id -e ZOOM_API_SECRET=your-client-secret -e ZOOM_ACCOUNT_ID=your-account-id -- node /path/to/mcp-zoom-recordings/dist/index.js
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ZOOM_API_KEY` | Server-to-Server OAuth Client ID |
| `ZOOM_API_SECRET` | Server-to-Server OAuth Client Secret |
| `ZOOM_ACCOUNT_ID` | Your Zoom Account ID |

## Usage

Once configured, you can ask Claude to interact with your Zoom recordings:

### List Recent Recordings

> "Show me my Zoom recordings from the past week"

> "List all recordings from January 2024"

### Get Recording Details

> "Get the download links for meeting abc123"

> "Show me the details of my last recorded meeting"

## MCP Tools Reference

### list_recordings

List Zoom cloud recordings for the authenticated account.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | Start date (YYYY-MM-DD). Default: 7 days ago |
| `to` | string | No | End date (YYYY-MM-DD). Default: today |
| `page_size` | number | No | Results per page (1-300). Default: 30 |
| `next_page_token` | string | No | Token for pagination |

**Returns:** List of meetings with recording counts and metadata.

### get_recording

Get detailed information and download URLs for a specific meeting's recordings.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `meeting_id` | string | Yes | Meeting UUID or meeting ID from list_recordings |

**Returns:** Recording details including download URLs for video, audio, transcripts, and chat logs.

## Development

```bash
# Run with hot reload
bun run dev

# Build for production
bun run build

# Run linter
bun run lint

# Fix lint issues
bun run lint:fix

# Type check
bun run typecheck

# Run tests
bun test
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

## License

MIT
