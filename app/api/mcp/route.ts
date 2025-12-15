import { NextRequest, NextResponse } from "next/server";
import { handleMCPRequest, MCPRequest } from "@/lib/mcp-handler";

export async function POST(request: NextRequest) {
  try {
    const body: MCPRequest = await request.json();

    // Validate JSON-RPC version
    if (body.jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: body.id || null,
          error: {
            code: -32600,
            message: "Invalid Request",
            data: { details: 'jsonrpc must be "2.0"' },
          },
        },
        { status: 400 }
      );
    }

    // Handle the MCP request
    const result = await handleMCPRequest(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: (await request.json()).id || null,
        error: {
          code: -32603,
          message: "Internal error",
          data: {
            details: error instanceof Error ? error.message : String(error),
          },
        },
      },
      { status: 500 }
    );
  }
}
