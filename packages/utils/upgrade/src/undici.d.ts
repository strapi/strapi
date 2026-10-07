// undici's internal files, imported directly to skip undici's main entry (see modules/npm/package.ts)
declare module 'undici/lib/dispatcher/proxy-agent.js' {
  import { ProxyAgent } from 'undici';

  export default ProxyAgent;
}

declare module 'undici/lib/dispatcher/dispatcher1-wrapper.js' {
  import { Dispatcher1Wrapper } from 'undici';

  export default Dispatcher1Wrapper;
}
