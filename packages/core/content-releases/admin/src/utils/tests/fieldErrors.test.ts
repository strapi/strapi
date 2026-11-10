import { createIntl } from 'react-intl';

import { getFieldLabel, getProblem } from '../fieldErrors';

const { formatMessage } = createIntl({ locale: 'en', messages: {} });

describe('getFieldLabel', () => {
  it.each([
    [['title'], 'Title'],
    [['metaTitle'], 'Meta title'],
    [['meta_title'], 'Meta title'],
    [['seo', 'metaDescription'], 'Seo › Meta description'],
    [['sections', '1', 'heading'], 'Sections #2 › Heading'],
  ])('reads %j as "%s"', (path, label) => {
    expect(getFieldLabel(path)).toBe(label);
  });
});

describe('getProblem', () => {
  it.each([
    ['title must be defined.', 'Required, or not a valid value'],
    ['title must be a `string` type', 'Required, or not a valid value'],
    ['This attribute must be unique', 'Already used by another entry'],
    ['title must be at least 3 characters', 'Too short: at least 3 characters'],
    ['title must be at most 10 characters', 'Too long: at most 10 characters'],
    ['title must be a valid email', 'Not a valid email'],
    ['Please specify a valid link.', 'Not a valid link'],
    ['title must match the following: "/^[a-z]+$/"', 'Doesn’t match the expected format'],
    ['title field must have at least 2 items', 'Needs at least 2 items'],
    ['title field must have at most 4 items', 'Allows at most 4 items'],
    ['title must be a valid integer', 'Must be a valid integer'],
  ])('says "%s" as "%s"', (message, problem) => {
    expect(getProblem({ path: ['title'], message }, formatMessage)).toBe(problem);
  });

  it('drops a nested field path from the start of its message', () => {
    expect(
      getProblem(
        { path: ['seo', 'title'], message: 'seo.title must be a valid integer' },
        formatMessage
      )
    ).toBe('Must be a valid integer');
  });
});
