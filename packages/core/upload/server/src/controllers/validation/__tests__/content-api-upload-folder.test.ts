import { validateUploadBody, validateUploadFilesBody } from '../content-api/upload';

describe.each([
  ['single file', false],
  ['multiple files', true],
])('content-api upload validation — folder (%s)', (_name, isMulti) => {
  const validate = (data: Record<string, unknown>) => validateUploadFilesBody(data, isMulti);

  it('leaves folder undefined when omitted', async () => {
    const result: any = await validate({});
    expect(result.folder).toBeUndefined();
  });

  it.each([null, 'null'])('accepts %p as the root folder', async (folder) => {
    const result: any = await validate({ folder });
    expect(result.folder).toBeNull();
  });

  it.each([
    [3, 3],
    ['3', 3],
  ])('accepts the folder id %p', async (folder, expected) => {
    const result: any = await validate({ folder });
    expect(result.folder).toBe(expected);
  });

  it.each(['abc', '', '0', 0, '-1', -1, '1.5', 1.5, ['1'], ['1', '2'], {}])(
    'rejects %p',
    async (folder) => {
      await expect(validate({ folder })).rejects.toMatchObject({ name: 'ValidationError' });
    }
  );

  it('keeps stripping folder from fileInfo', async () => {
    const fileInfo = { name: 'a.png', folder: 3 };
    const result: any = await validate({ fileInfo: isMulti ? [fileInfo] : fileInfo });
    const info = isMulti ? result.fileInfo[0] : result.fileInfo;

    expect(info).not.toHaveProperty('folder');
    expect(result.folder).toBeUndefined();
  });
});

describe('content-api upload validation — replace / file info update', () => {
  it('does not validate a top-level folder', async () => {
    // replace and updateFileInfo never read a top-level folder, so it is not validated there
    await expect(validateUploadBody({ folder: 'abc' })).resolves.toBeTruthy();
  });
});
