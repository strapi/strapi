import type { RequestInit, Response } from 'node-fetch';
import type { HttpsProxyAgent } from 'https-proxy-agent';

export interface Fetch {
  (url: string, options: RequestInit): Promise<Response>;
  agent?: HttpsProxyAgent;
}
