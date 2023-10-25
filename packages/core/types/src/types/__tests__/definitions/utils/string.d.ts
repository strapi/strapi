import type { Utils } from '../../..';

// TODO: Implement tests for errors (constraints, etc...)

// String

// String > Dict
type NumberDict = Utils.String.Dict<number>;
type StringDict = Utils.String.Dict<string>;
type BooleanDict = Utils.String.Dict<boolean>;

// String > EndsWith
type EndsWithCorrectNumber = Utils.String.EndsWith<'Hello World 42', 42>;
type EndsWithIncorrectNumber = Utils.String.EndsWith<'Hello World 42', 100>;
type EndsWithCorrectString = Utils.String.EndsWith<'Hello World', 'World'>;
type EndsWithIncorrectString = Utils.String.EndsWith<'Hello World', 'Hello'>;

// String > StartsWith
type StartsWithCorrectNumber = Utils.String.StartsWith<'42 Hello World', 42>;
type StartsWithIncorrectNumber = Utils.String.StartsWith<'42 Hello World', 100>;
type StartsWithCorrectString = Utils.String.StartsWith<'Hello World', 'Hello'>;
type StartsWithIncorrectString = Utils.String.StartsWith<'Hello World', 'World'>;

// String > Includes
type IncludesNumber = Utils.String.Includes<42>;
type IncludesString = Utils.String.Includes<'foo'>;
type IncludesBoolean = Utils.String.Includes<boolean>;
type IncludesBooleanLiteral = Utils.String.Includes<true>;

// String > NonEmpty
type NonEmptyOnEmptyString = Utils.String.NonEmpty<''>;
type NonEmptyOnNonEmptyString = Utils.String.NonEmpty<'Hello World'>;

// String > Prefix
type PrefixEmptyString = Utils.String.Prefix<'', 'Hello'>;
type PrefixString = Utils.String.Prefix<string, 'Hello '>;
type PrefixLiteralString = Utils.String.Prefix<'World', 'Hello '>;
type PrefixLiteralStringUnion = Utils.String.Prefix<'World' | 'Everyone', 'Hello '>;
type PrefixLiteralStringWithUnion = Utils.String.Prefix<'World', 'Hello ' | 'Bonjour ' | 'Hola '>;

// String > Suffix
type SuffixEmptyString = Utils.String.Suffix<'', 'Hello'>;
type SuffixString = Utils.String.Suffix<string, '.'>;
type SuffixLiteralString = Utils.String.Suffix<'Hello', ' World'>;
type SuffixLiteralStringUnion = Utils.String.Suffix<'Hello ' | 'Bonjour ' | 'Hola ', 'World'>;
type SuffixLiteralStringWithUnion = Utils.String.Suffix<'Hello ', 'World' | 'Everyone'>;

// String > Literal
type Literal = Utils.String.Literal;

// String > Split
type SplitEmptyStringBySpace = Utils.String.Split<'', ' '>;
type SplitEmptyStringByEmptyString = Utils.String.Split<'', ''>;
type SplitEmptyStringByString = Utils.String.Split<'', ''>;
type SplitBySpace = Utils.String.Split<'Hello World, How are you?', ' '>;
type SplitByEmptyString = Utils.String.Split<'Hello', ''>;
type SplitByString = Utils.String.Split<'Hello', string>;

export {
  // String
  // String > Dict
  NumberDict,
  StringDict,
  BooleanDict,
  // String > EndsWith
  EndsWithCorrectNumber,
  EndsWithIncorrectNumber,
  EndsWithCorrectString,
  EndsWithIncorrectString,
  // String > StartsWith
  StartsWithCorrectNumber,
  StartsWithIncorrectNumber,
  StartsWithCorrectString,
  StartsWithIncorrectString,
  // String > Includes
  IncludesNumber,
  IncludesString,
  IncludesBoolean,
  IncludesBooleanLiteral,
  // String > NonEmpty
  NonEmptyOnEmptyString,
  NonEmptyOnNonEmptyString,
  // String > Prefix
  PrefixEmptyString,
  PrefixString,
  PrefixLiteralString,
  PrefixLiteralStringUnion,
  PrefixLiteralStringWithUnion,
  // String > Suffix
  SuffixEmptyString,
  SuffixString,
  SuffixLiteralString,
  SuffixLiteralStringUnion,
  SuffixLiteralStringWithUnion,
  // String > Literal
  Literal,
  // String > Split
  SplitEmptyStringBySpace,
  SplitEmptyStringByEmptyString,
  SplitEmptyStringByString,
  SplitBySpace,
  SplitByEmptyString,
  SplitByString,
};
