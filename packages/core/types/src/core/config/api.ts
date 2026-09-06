export interface ResponsesProp {
  privateAttributes?: string[];
}

export interface RestProp {
  prefix?: string;
  /**
   * @deprecated Not read by Strapi. Reserved for backward compatibility in config files.
   */
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
  /**
   * When true, the Document Service enforces relational field constraints (required media and
   * required relations) on non-draft writes. When false or unset, these are not enforced (legacy
   * behaviour). Deliberately broad: future relational enforcements may be added under this flag and
   * treated as bug fixes.
   */
  strictRelations?: boolean;
}

export interface Api {
  responses?: ResponsesProp;
  rest?: RestProp;
  documents?: DocumentsProp;
}
