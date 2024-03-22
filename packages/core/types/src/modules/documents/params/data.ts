import type * as UID from '../../../uid';

import type * as AttributeUtils from './attributes';

export type Input<TSchemaUID extends UID.Schema> = AttributeUtils.GetValues<TSchemaUID>;
