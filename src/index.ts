/**
 * MCP Zoom Recordings Server Entry Point
 *
 * Implements the MCP server that exposes Zoom cloud recording tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ZoomAuth, loadZoomConfig } from "./auth";
import { ZoomClient } from "./clients/zoom-client";

const SERVER_NAME = "mcp-zoom-recordings";
const SERVER_VERSION = "0.1.0";

/**
 * Create and configure the MCP server.
 *
 * @param client - The authenticated ZoomClient for API calls
 */
function createServer(client: ZoomClient): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Tool handlers will be registered in P1.2
  // The client is captured in closure for use by handlers
  void client;

  return server;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  // Load configuration and initialize clients
  const config = loadZoomConfig();
  const auth = new ZoomAuth(config);
  const client = new ZoomClient(auth);

  // Create the MCP server
  const server = createServer(client);

  // Connect using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start the server
main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
