import { Database } from '../';
import { Action } from '../lifecycles';

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
  lifecycles?: {
    [k in Action]: () => void;
  };
}

export interface SchemaProvideer {
  sync(): Promise<void>;
  syncSchema(): Promise<void>;
  reset(): Promise<void>;
  create(): Promise<void>;
  drop(): Promise<void>;
}

export default function(db: Database): SchemaProvideer;
