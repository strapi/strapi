import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { downloadFile } from '../downloadFile';

const server = setupServer(
  rest.get('*/some/file', async (req, res, ctx) => {
    const file = new File([new Blob(['1'.repeat(1024 * 1024 + 1)])], 'image.png', {
      type: 'image/png',
    });
    const buffer = await new Response(file).arrayBuffer();

    return res(ctx.set('Content-Type', 'image/png'), ctx.body(buffer));
  })
);

describe('Upload | utils | downloadFile', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

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
