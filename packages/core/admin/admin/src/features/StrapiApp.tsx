import { createContext } from '../components/Context';
import { RBAC } from '../core/apis/rbac';
import { Router } from '../core/apis/router';

import type { StrapiApp } from '../StrapiApp';

/* -------------------------------------------------------------------------------------------------
 * StrapiApp
 * -----------------------------------------------------------------------------------------------*/
interface StrapiAppContextValue
  extends Pick<
      StrapiApp,
      | 'customFields'
      | 'getPlugin'
      | 'getAdminInjectedComponents'
      | 'plugins'
      | 'runHookParallel'
      | 'runHookSeries'
    >,
    Pick<Router, 'menu' | 'settings'> {
  components: StrapiApp['library']['components'];
  fields: StrapiApp['library']['fields'];
  rbac: RBAC;
  runHookWaterfall: <TData>(
    name: Parameters<StrapiApp['runHookWaterfall']>[0],
    initialValue: TData
  ) => TData;
}

const [StrapiAppProvider, useStrapiApp] = createContext<StrapiAppContextValue>('StrapiApp');

export { StrapiAppProvider, useStrapiApp };
export type { StrapiAppContextValue };
