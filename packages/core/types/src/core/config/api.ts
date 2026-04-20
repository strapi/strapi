export interface ResponsesProp {
  privateAttributes?: string[];
}

export interface RestProp {
  prefix?: string;
  port?: number;
  defaultLimit?: number;
  maxLimit?: number;
  withCount?: boolean;
  /**
   * When true, REST query params are validated: only known top-level keys (and params registered via
   * contentAPI.addQueryParams) are allowed. Unrecognized keys result in 400.
   */
  strictParams?: boolean;
}

export interface DocumentsProp {
  /**
   * When true, Document Service methods reject params with unrecognized root-level keys (e.g. invalid
   * status, locale). When false or unset, unknown params are ignored.
   */
  strictParams?: boolean;
}

export interface Api {
  responses?: ResponsesProp;
  rest?: RestProp;
  documents?: DocumentsProp;
}
