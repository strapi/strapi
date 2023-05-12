export type Literal = string | number | bigint | boolean;

export type Contains<S extends Literal> = `${string}${S}${string}`;
export type NonEmpty<T extends string> = T extends '' ? never : T;

export type AddSuffix<T extends string, S extends Literal> = `${T}${S}`;
export type AddPrefix<T extends string, S extends Literal> = `${S}${T}`;
