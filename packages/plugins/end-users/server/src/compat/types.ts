/**
 * What a compat endpoint decides: the status and the body of the answer, a refusal included, and
 * the `Set-Cookie` values to send with it.
 */
export interface CompatResult {
  status: number;
  body: unknown;
  cookies?: string[];
}
