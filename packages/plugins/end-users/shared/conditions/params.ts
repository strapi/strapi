/**
 * Whether a condition's param must be asked for: a relation-valued attribute asks unless exactly one
 * entry can be chosen; anything else asks only when required. The modal and `paramProblem` share it.
 */
export const isParamNeeded = (
  param: { type: string; required?: boolean; relationTarget?: string },
  candidates: number
): boolean =>
  param.type === 'attribute' && param.relationTarget !== undefined
    ? candidates !== 1
    : param.required === true;
