/** Converts policy identifiers into select options. */
const formatPolicies = (policies: string[]) =>
  policies.map((policy) => ({ label: policy, value: policy }));

export { formatPolicies };
