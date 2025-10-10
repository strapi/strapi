type Routes = Record<
  string,
  {
    config: {
      auth: {
        scope: string[];
      };
    };
    handler: string;
    info: {
      apiName: string;
      type: string;
    };
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
  }[]
>;

/**
 * GET /content-api/routes - List content API routes
 */
export declare namespace List {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    data: Routes;
  }
}
