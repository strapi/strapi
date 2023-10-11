export interface ResponsesProp {
  privateAttributes: string[];
}

export interface RestProp {
  prefix?: string;
  port?: number;
  defaultLimit?: number;
  maxLimit?: number;
  withCount?: boolean;
}

export interface Api {
  responses?: ResponsesProp;
  rest: RestProp;
}
