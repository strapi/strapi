import { Common } from '@strapi/strapi';
import * as AttributeUtils from './attributes';

export type Input<TSchemaUID extends Common.UID.Schema> = AttributeUtils.GetValues<TSchemaUID>;
