/**
 * MCP Zoom Recordings Server Entry Point
 *
 * Implements the MCP server that exposes Zoom cloud recording tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { ZoomAuth, loadZoomConfig } from "./auth";
import { ZoomClient } from "./clients/zoom-client";
import {
  recordingTools,
  handleListRecordings,
  handleGetRecording,
} from "./tools/recordings";

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

  // Register tools/list handler - returns available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: recordingTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Register tools/call handler - routes tool calls to appropriate handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_recordings": {
          const result = await handleListRecordings(client, args);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        case "get_recording": {
          const result = await handleGetRecording(client, args);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      // Re-throw MCP errors as-is
      if (error instanceof McpError) {
        throw error;
      }
      // Wrap other errors in MCP error format
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new McpError(ErrorCode.InternalError, message);
    }
  });

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
