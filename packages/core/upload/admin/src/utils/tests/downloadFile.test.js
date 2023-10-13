import { downloadFile } from '../downloadFile';

describe('downloadFile', () => {
  test('Download target as blob', async () => {
    const setAttributeSpy = jest.fn();
    const clickSpy = jest.fn();
    const hrefSpy = jest.fn();

    const documentSpy = jest.spyOn(document, 'createElement');

    documentSpy.mockReturnValue({
      click: clickSpy,
      set href(val) {
        hrefSpy(val);
      },
      setAttribute: setAttributeSpy,
    });

    await downloadFile('/some/file', 'my-filename');

    expect(documentSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(setAttributeSpy).toHaveBeenCalledWith('download', 'my-filename');
    expect(hrefSpy).toHaveBeenCalledWith(expect.stringContaining('http://localhost:4000/assets'));
  });
});
