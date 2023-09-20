import type { Common } from '../../../types';
import type * as AttributeUtils from './attributes';

export type Input<TSchemaUID extends Common.UID.Schema> = AttributeUtils.GetValues<TSchemaUID>;
