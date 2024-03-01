import type * as Plugin from '../../plugin';

import type * as UID from '../../uid';
import type { Shared } from '../../public';
import type { Guard, Object, If } from '../../utils';

export type GetPluginParams<TSchemaUID extends UID.Schema> = Guard.OfTypes<
  [never, undefined],
  Object.Values<{
    [TPluginName in keyof Shared.DocumentServicePluginParams]: Shared.DocumentServicePluginParams[TPluginName] extends infer TParam
      ? If<Plugin.IsEnabled<TPluginName, TSchemaUID>, TParam>
      : never;
  }>
>;
