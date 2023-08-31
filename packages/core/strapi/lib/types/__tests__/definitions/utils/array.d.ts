import { Utils } from '@strapi/strapi';

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
type ObjectValues = Utils.Array.Values<[Obj, { prop1: true; prop2: false }]>;

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
  ObjectValues,
  IsEmptyWithEmptyTuple,
  IsEmptyWithNotEmptyTuple,
  IsNotEmptyWithNotEmptyTuple,
  IsNotEmptyWithEmptyTuple,
};
