import { Utils } from '../../..';

type Obj = {
  foo: 'bar';
  baz: false;
  prop: {
    foo: 'bar';
    bar: 'foo';
  };
};

type StringValues = Utils.Array.Values<['foo', 'bar', 'baz']>;
type NumberValues = Utils.Array.Values<[1, 2, 3]>;
type BoolValues = Utils.Array.Values<[true, false, true]>;
type TrueBoolLiteralValues = Utils.Array.Values<[true, true, true]>;
type FalseBoolLiteralValues = Utils.Array.Values<[false, false, false]>;
type ObjectValues = Utils.Array.Values<[Obj, { prop1: true; prop2: false }]>;
type MixedValues = Utils.Array.Values<[Obj, 1, 'foo', true]>;
type ContainsNever = Utils.Array.Values<[never, Obj, 1, 'foo', true]>;

// TODO move this to tuple utils

// Is Empty

type IsEmptyWithEmptyTuple = Utils.Array.IsEmpty<[]>;
type IsEmptyWithNotEmptyTuple = Utils.Array.IsEmpty<['foo', 'bar']>;

// Is Not Empty

type IsNotEmptyWithNotEmptyTuple = Utils.Array.IsNotEmpty<['foo', 'bar']>;
type IsNotEmptyWithEmptyTuple = Utils.Array.IsNotEmpty<[]>;

export {
  StringValues,
  NumberValues,
  BoolValues,
  TrueBoolLiteralValues,
  FalseBoolLiteralValues,
  ObjectValues,
  MixedValues,
  ContainsNever,
  IsEmptyWithEmptyTuple,
  IsEmptyWithNotEmptyTuple,
  IsNotEmptyWithNotEmptyTuple,
  IsNotEmptyWithEmptyTuple,
};
