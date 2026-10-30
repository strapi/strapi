import type * as Documents from '../../../modules/documents';
import type * as Attribute from '..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;

type SingleMedia = Attribute.Media<'images'>;
type MultipleMedia = Attribute.Media<'images' | 'files', true>;

// Output: media values stay loose, narrowing them would break code that compiles today

true satisfies Assert<IsAny<Attribute.Value<SingleMedia>>>;
true satisfies Assert<IsEqual<Attribute.Value<MultipleMedia>, any[]>>;
true satisfies Assert<IsAny<Attribute.Value<Attribute.AnyAttribute>>>;

// Blocks image nodes store a snapshot of the file's fields, not a populated file document

type ImageNode = Extract<Attribute.BlocksValue[number], { type: 'image' }>;

true satisfies Assert<IsAny<ImageNode['image']>>;

// Input: single media keeps accepting any value

type SingleMediaInput = Documents.Params.Attribute.GetValue<SingleMedia>;

true satisfies Assert<IsAny<SingleMediaInput>>;

// Input: multiple media accepts the relation formats, on top of any array

type MultipleMediaInput = Documents.Params.Attribute.GetValue<MultipleMedia>;

[12, 13] satisfies MultipleMediaInput;
['abc123'] satisfies MultipleMediaInput;
[{ id: 12 }, { documentId: 'abc123' }] satisfies MultipleMediaInput;
[12, { id: 13 }] satisfies MultipleMediaInput;
({ set: [12] }) satisfies MultipleMediaInput;
({ connect: [{ documentId: 'abc123' }], disconnect: [13] }) satisfies MultipleMediaInput;
null satisfies MultipleMediaInput;

// @ts-expect-error A multiple media input is not a single ID
12 satisfies MultipleMediaInput;
// @ts-expect-error A multiple media input is not a boolean
true satisfies MultipleMediaInput;
// @ts-expect-error Connect only accepts IDs or relation objects
({ connect: [true] }) satisfies MultipleMediaInput;
