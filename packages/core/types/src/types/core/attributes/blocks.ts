import type { Attribute } from '..';

type BlocksAttribute = Attribute.OfType<'blocks'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type BlocksValue<T extends object = object> = T;

export type GetBlocksValue<T extends Attribute.Attribute> = T extends BlocksAttribute
  ? BlocksValue
  : never;

export type Blocks = BlocksAttribute;
