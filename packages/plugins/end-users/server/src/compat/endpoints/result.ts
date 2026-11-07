/** What a compat endpoint decides: the status and the body of the answer, a refusal included. */
export interface CompatResult {
  status: number;
  body: unknown;
}

export const ok = (body: unknown): CompatResult => ({ status: 200, body });
