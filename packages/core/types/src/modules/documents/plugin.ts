import type * as Plugin from '../../plugin';

import type * as UID from '../../uid';
import type * as Public from '../../public';
import type { Guard, Object, If } from '../../utils';

export type GetPluginParams<TSchemaUID extends UID.Schema> = Guard.OfTypes<
  [never, undefined],
  Object.Values<{
    [TPluginName in keyof Public.DocumentServicePluginParams]: Public.DocumentServicePluginParams[TPluginName] extends infer TParam
      ? If<Plugin.IsEnabled<TPluginName, TSchemaUID>, TParam>
      : never;
  }>
>;
