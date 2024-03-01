import type { UID } from '../../../public';

import type * as AttributeUtils from './attributes';

export type Input<TSchemaUID extends UID.Schema> = AttributeUtils.GetValues<TSchemaUID>;
