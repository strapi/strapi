import formatFilters from '../formatFilters';

describe('UPLOAD | utils | formatFilters', () => {
  it('should remove the file filter and add image and video filters', () => {
    const stringParams = '&mime_ncontains=file&mime_contains=file';

    const actual = formatFilters(stringParams);
    const expected =
      '&mime_contains=image&mime_contains=video&mime_ncontains=image&mime_ncontains=video';

    expect(actual).toEqual(expected);
  });

  it('should return the string params if there is no file filter', () => {
    const stringParams = '&mime_contains=image&mime_contains=video';

    const actual = formatFilters(stringParams);
    const expected = '&mime_contains=image&mime_contains=video';
    expect(actual).toEqual(expected);
  });
});
