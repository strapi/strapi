import { Utils } from '../../..';

// Aux
type Base = { x: 'foo' | 'bar' };
type Obj = { foo: { x: 'foo' }; bar: { x: 'bar' }; other: { x: '42' } };

// KeysBy
type KeysByString = Utils.Object.KeysBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, string>;
type KeysByNumber = Utils.Object.KeysBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, number>;
type KeysByNever = Utils.Object.KeysBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, never>;
type KeysByUnknown = Utils.Object.KeysBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, unknown>;
type KeysByObj = Utils.Object.KeysBy<Obj, Base>;

// KeysExcept
type KeysExceptString = Utils.Object.KeysExcept<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, string>;
type KeysExceptNumber = Utils.Object.KeysExcept<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, number>;
type KeysExceptNever = Utils.Object.KeysExcept<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, never>;
type KeysExceptUnknown = Utils.Object.KeysExcept<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, unknown>;
type KeysExceptObj = Utils.Object.KeysExcept<Obj, Base>;

// PickBy
type PickByString = Utils.Object.PickBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, string>;
type PickByNumber = Utils.Object.PickBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, number>;
type PickByNever = Utils.Object.PickBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, never>;
type PickByUnknown = Utils.Object.PickBy<{ foo: 'bar'; bar: 'foo'; foobar: 2 }, unknown>;
type PickByObj = Utils.Object.PickBy<Obj, Base>;

// Values
type Values = Utils.Object.Values<{ foo: 'bar'; bar: 'foo'; foobar: 2 }>;
type ValuesNever = Utils.Object.Values<never>;
type ValuesContainNever = Utils.Object.Values<{ foo: 'bar'; bar: 'foo'; foobar: never }>;

// Replace
type Replace = Utils.Object.Replace<{ foo: 'bar'; bar: 'foo' }, { foo: 2 }>;

export {
  // KeysBy
  KeysByString,
  KeysByNumber,
  KeysByNever,
  KeysByUnknown,
  KeysByObj,

  // KeysExcept
  KeysExceptString,
  KeysExceptNumber,
  KeysExceptNever,
  KeysExceptUnknown,
  KeysExceptObj,

  // PickBy
  PickByString,
  PickByNumber,
  PickByNever,
  PickByUnknown,
  PickByObj,

  // Values
  Values,
  ValuesNever,
  ValuesContainNever,

  // Replace
  Replace,
};
