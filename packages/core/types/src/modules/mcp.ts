export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPService {
  /**
   * Check if the MCP service is enabled in configuration
   */
  isEnabled(): boolean;

  /**
   * Check if the MCP server is currently running
   */
  isRunning(): boolean;

  /**
   * Get list of available MCP tools
   */
  getAvailableTools(): MCPTool[];

  /**
   * Handle a JSON-RPC request
   */
  handleRequest(request: MCPRequest): Promise<MCPResponse>;

  /**
   * Start the MCP server
   */
  start(): Promise<void>;

  /**
   * Stop the MCP server
   */
  stop(): Promise<void>;

  /**
   * Start the MCP server in stdio mode for CLI usage
   */
  startStdio(): void;
}
