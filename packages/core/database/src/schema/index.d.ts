import { Database } from '../';
import { Action } from '../lifecycles';
import { SubscriberMap } from '../lifecycles';

type Type =
  | 'string'
  | 'text'
  | 'richtext'
  | 'json'
  | 'enumeration'
  | 'password'
  | 'email'
  | 'integer'
  | 'biginteger'
  | 'float'
  | 'decimal'
  | 'date'
  | 'time'
  | 'datetime'
  | 'timestamp'
  | 'boolean'
  | 'relation';

export interface Attribute {
  type: Type;
}

export interface Model {
  uid: string;
  tableName: string;
  attributes: {
    id: {
      type: 'increments';
    };
    [k: string]: Attribute;
  };
  lifecycles?: SubscriberMap;
}

export interface SchemaProvider {
  sync(): Promise<void>;
  syncSchema(): Promise<void>;
  reset(): Promise<void>;
  create(): Promise<void>;
  drop(): Promise<void>;
}

export default function (db: Database): SchemaProvider;
