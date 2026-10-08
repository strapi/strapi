import type * as Data from '../../../data';
import type * as Documents from '../../../modules/documents';
import type * as Attribute from '..';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

type File = Data.ContentType<'plugin::upload.file'>;

type SingleMedia = Attribute.Media<'images'>;
type MultipleMedia = Attribute.Media<'images' | 'files', true>;

// Output: media values are upload file documents

true satisfies Assert<IsEqual<Attribute.MediaFile, File>>;
true satisfies Assert<IsEqual<Attribute.Value<SingleMedia>, File>>;
true satisfies Assert<IsEqual<Attribute.Value<MultipleMedia>, File[]>>;
true satisfies Assert<IsEqual<Attribute.Value<Attribute.Media>, File>>;

// Output: media values are not any

// @ts-expect-error A media value is not a string
'file.png' satisfies Attribute.Value<SingleMedia>;
// @ts-expect-error A single media value is not an array
[] satisfies Attribute.Value<SingleMedia>;

// Input: media accepts the relation formats, by ID or document ID

type SingleMediaInput = Documents.Params.Attribute.GetValue<SingleMedia>;
type MultipleMediaInput = Documents.Params.Attribute.GetValue<MultipleMedia>;

12 satisfies SingleMediaInput;
'abc123' satisfies SingleMediaInput;
({ id: 12 }) satisfies SingleMediaInput;
({ documentId: 'abc123' }) satisfies SingleMediaInput;
null satisfies SingleMediaInput;

[12, 13] satisfies MultipleMediaInput;
['abc123'] satisfies MultipleMediaInput;
[{ id: 12 }, { id: 13 }] satisfies MultipleMediaInput;
({ set: [12] }) satisfies MultipleMediaInput;
({ connect: [{ documentId: 'abc123' }], disconnect: [13] }) satisfies MultipleMediaInput;
null satisfies MultipleMediaInput;

// @ts-expect-error A single media input is not an array
[12] satisfies SingleMediaInput;
// @ts-expect-error A media input is not a boolean
true satisfies MultipleMediaInput;

// Generic attributes and documents keep their values unchanged

type IsAny<T> = 0 extends 1 & T ? true : false;

true satisfies Assert<IsAny<Attribute.Value<Attribute.AnyAttribute>>>;
true satisfies Assert<IsAny<Data.ContentType['someAttribute']>>;
