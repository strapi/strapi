export interface ResponsesProp {
  privateAttributes?: string[] | undefined;
}

export interface RestProp {
  prefix?: string | undefined;
  port?: number | undefined;
  defaultLimit?: number | undefined;
  maxLimit?: number | undefined;
  withCount?: boolean | undefined;
}

export interface Api {
  responses?: ResponsesProp | undefined;
  rest?: RestProp | undefined;
}
