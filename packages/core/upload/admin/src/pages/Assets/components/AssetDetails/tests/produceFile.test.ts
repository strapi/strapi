// Bare RTL rather than the admin harness: this hook takes no context, and the
// harness's provider tree (router, matchMedia) is unrelated weight here.
import { act, renderHook } from '@testing-library/react';

import { useCropImg } from '../useCropImg';

/**
 * jsdom has no canvas implementation, so the 2D context is stubbed and the draw
 * asserted through the calls made on it. This covers the half of the export the
 * pure geometry tests cannot reach: that the rotation is actually baked in, and
 * that the output is sized to the rotated crop rather than the source.
 */
const NATURAL = { width: 800, height: 600 };

let context: {
  translate: jest.Mock;
  rotate: jest.Mock;
  drawImage: jest.Mock;
};
let canvas: HTMLCanvasElement;

beforeEach(() => {
  context = { translate: jest.fn(), rotate: jest.fn(), drawImage: jest.fn() };
  canvas = document.createElement('canvas');

  jest.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  jest
    .spyOn(canvas, 'toBlob')
    .mockImplementation((callback) => callback(new Blob(['x'], { type: 'image/png' })));
  // Delegate everything that is not a canvas: renderHook builds its own elements
  // through this same call, so swallowing them breaks React's render.
  const createElement = document.createElement.bind(document);
  jest
    .spyOn(document, 'createElement')
    .mockImplementation((tag: string) => (tag === 'canvas' ? canvas : createElement(tag)));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const setup = () => {
  const { result } = renderHook(() => useCropImg());
  const image = {
    naturalWidth: NATURAL.width,
    naturalHeight: NATURAL.height,
  } as HTMLImageElement;

  act(() => {
    result.current.init(image);
  });

  return result;
};

describe('produceFile', () => {
  it('draws the source rect untransformed when nothing was rotated', async () => {
    const result = setup();

    await act(async () => {
      await result.current.produceFile('photo.png', 'image/png');
    });

    expect(canvas.width).toBe(NATURAL.width);
    expect(canvas.height).toBe(NATURAL.height);
    expect(context.rotate).toHaveBeenCalledWith(0);
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      NATURAL.width,
      NATURAL.height,
      -NATURAL.width / 2,
      -NATURAL.height / 2,
      NATURAL.width,
      NATURAL.height
    );
  });

  it('bakes a quarter turn into the canvas and swaps the output dimensions', async () => {
    const result = setup();

    act(() => {
      result.current.rotate('right');
    });

    await act(async () => {
      await result.current.produceFile('photo.png', 'image/png');
    });

    // Output follows the rotated geometry...
    expect(canvas.width).toBe(NATURAL.height);
    expect(canvas.height).toBe(NATURAL.width);
    // ...while the pixels sampled are still the unrotated source.
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(context.translate).toHaveBeenCalledWith(NATURAL.height / 2, NATURAL.width / 2);
    expect(context.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      NATURAL.width,
      NATURAL.height,
      -NATURAL.width / 2,
      -NATURAL.height / 2,
      NATURAL.width,
      NATURAL.height
    );
  });

  it('restores the original dimensions after four turns', async () => {
    const result = setup();

    act(() => {
      for (let turn = 0; turn < 4; turn += 1) {
        result.current.rotate('right');
      }
    });

    await act(async () => {
      await result.current.produceFile('photo.png', 'image/png');
    });

    expect(canvas.width).toBe(NATURAL.width);
    expect(canvas.height).toBe(NATURAL.height);
  });
});

describe('rotate and a locked aspect ratio', () => {
  it('inverts the locked ratio on a quarter turn', () => {
    // A ratio locked as 2:1 describes the orientation it was locked in. After a
    // quarter turn the same selection is 1:2, so leaving the number alone makes
    // every later resize enforce the pre-rotation shape.
    const result = setup();

    act(() => {
      result.current.setAspectRatio(2);
    });
    expect(result.current.aspectRatio).toBe(2);

    act(() => {
      result.current.rotate('right');
    });
    expect(result.current.aspectRatio).toBe(0.5);

    act(() => {
      result.current.rotate('right');
    });
    expect(result.current.aspectRatio).toBe(2);
  });

  it('leaves an unlocked ratio alone', () => {
    const result = setup();

    act(() => {
      result.current.rotate('right');
    });

    expect(result.current.aspectRatio).toBeNull();
  });
});
