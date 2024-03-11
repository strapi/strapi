const castIncludes = (arr: unknown[], val: unknown, cast: (val: unknown) => unknown): boolean =>
  arr.map((val) => cast(val)).includes(cast(val));

const includesString = (arr: unknown[], val: unknown) => castIncludes(arr, val, String);

export { includesString };
