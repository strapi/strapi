/**
 * What a compat endpoint decides: the status and the body of the answer, a refusal included, and
 * the `Set-Cookie` values and any other headers to send with it.
 */
export interface CompatResult {
  status: number;
  body: unknown;
  cookies?: string[];
  /** Response headers to set with the answer. */
  headers?: Record<string, string>;
}
