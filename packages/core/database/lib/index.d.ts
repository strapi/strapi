type BooleanWhere<T> = {
  $and?: WhereParams<T>[];
  $or?: WhereParams<T>[];
  $not?: WhereParams<T>;
};

type WhereParams<T> = {
  [K in keyof T]?: T[K];
} &
  BooleanWhere<T>;

type Sortables<T> = {
  // check sortable
  [P in keyof T]: P;
}[keyof T];

type Direction = 'asc' | 'ASC' | 'DESC' | 'desc';

type FindParams<T> = {
  select?: (keyof T)[];
  // TODO: add nested operators & relations
  where?: WhereParams<T>;
  limit?: number;
  offset?: number;
  orderBy?: // TODO: add relations
  | Sortables<T>
    | Sortables<T>[]
    | { [K in Sortables<T>]?: Direction }
    | { [K in Sortables<T>]?: Direction }[];
};

interface QueryFromContentType<T extends keyof AllTypes> {
  findOne(params: FindParams<AllTypes[T]>): AllTypes[T];
  findMany(params: FindParams<AllTypes[T]>): AllTypes[T][];
}

interface ModelConfig {
  tableName: string;
  [k: string]: any;
}

export class Database {
  static transformContentTypes(contentTypes: any[]): ModelConfig[];
  query<T extends keyof AllTypes>(uid: T): QueryFromContentType<T>;
}
