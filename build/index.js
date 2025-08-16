import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const server = new McpServer({
    name: "simple-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.tool("echo", "Repite el texto que recibe como entrada", {
    text: {
        type: "string",
        description: "Texto a repetir",
    },
}, async ({ text }) => {
    return {
        content: [
            {
                type: "text",
                text: `Echo: ${text}`,
            },
        ],
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Simple MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
