import type { Attribute, Common } from '..';
import type { Utils } from '../..';

export interface ComponentProperties<
  TComponentUID extends Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue = Utils.Expression.BooleanValue
> {
  component: TComponentUID;
  repeatable?: TRepeatable;
}

export type Component<
  TComponentUID extends Common.UID.Component = Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue = Utils.Expression.BooleanValue
> = Attribute.OfType<'component'> &
  // Component Properties
  ComponentProperties<TComponentUID, TRepeatable> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type ComponentValue<
  TComponentUID extends Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue
> = Attribute.GetValues<TComponentUID> extends infer TValues
  ? Utils.Expression.MatchFirst<
      [
        // Repeatable component
        [Utils.Expression.IsTrue<TRepeatable>, TValues[]],
        // Single component
        [Utils.Expression.IsFalse<TRepeatable>, TValues]
      ],
      // If TRepeatable is neither true nor false, then return every possible types
      TValues[] | TValues
    >
  : never;

export type GetComponentValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID, infer TRepeatable>
    ? ComponentValue<TComponentUID, TRepeatable>
    : never;

export type GetComponentTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID> ? TComponentUID : never;
