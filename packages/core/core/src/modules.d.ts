declare module 'koa-favicon' {
  import type Koa from 'koa';

  export default function favicon(
    path: string,
    options?: { maxAge?: number; mime?: string }
  ): Koa.Middleware;
}

// undici's internal files, imported directly to skip undici's main entry (see utils/fetch.ts)
declare module 'undici/lib/dispatcher/proxy-agent.js' {
  import { ProxyAgent } from 'undici';

  export default ProxyAgent;
}

declare module 'undici/lib/dispatcher/dispatcher1-wrapper.js' {
  import { Dispatcher1Wrapper } from 'undici';

  export default Dispatcher1Wrapper;
}

declare module 'undici/lib/dispatcher/dispatcher.js' {
  import { Dispatcher } from 'undici';

  export default Dispatcher;
}

declare module 'undici/lib/api/api-connect.js' {
  import type { Dispatcher } from 'undici';

  const connect: Dispatcher['connect'];

  export default connect;
}
