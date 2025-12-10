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
  isEnabled(): boolean;
  isRunning(): boolean;
  getAvailableTools(): MCPTool[];
  handleRequest(request: MCPRequest): Promise<MCPResponse | undefined>;
  start(): Promise<void>;
  stop(): Promise<void>;
  startStdio(): void;
}

export interface MCPToolHandler {
  tool: MCPTool;
  handler: (params?: any) => Promise<any>;
}
