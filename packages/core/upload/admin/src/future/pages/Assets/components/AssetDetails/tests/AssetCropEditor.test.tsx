import { fireEvent, render, screen } from '@tests/utils';

import { AssetCropEditor } from '../AssetCropEditor';
import { AssetPreview } from '../AssetPreview';

import type { AssetWithPopulatedCreatedBy } from '../../../../../../../../shared/contracts/files';

const asset = {
  id: 1,
  name: 'photo.png',
  alternativeText: 'A photo',
  caption: null,
  ext: '.png',
  mime: 'image/png',
  size: 1024,
  width: 800,
  height: 600,
  hash: 'photo',
  url: '/uploads/photo.png',
  folder: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  formats: {},
  createdBy: null,
} as unknown as AssetWithPopulatedCreatedBy;

/**
 * jsdom (v20) has no PointerEvent constructor, `naturalWidth`/`naturalHeight`
 * are always 0, and layout boxes are empty — everything the crop editor's
 * pointer-to-natural mapping relies on is stubbed here.
 */
const pointerEvent = (type: string, props: Record<string, unknown>) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, props);
  return event;
};

const NATURAL = { width: 800, height: 600 };

let restoreRect: () => void;
let restoreNatural: () => void;

beforeAll(() => {
  // AssetPreview (rendered by the parity test below) observes its image with a
  // ResizeObserver, which jsdom doesn't implement.
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}

      unobserve() {}

      disconnect() {}
    };
  }

  const originalRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: NATURAL.width,
      bottom: NATURAL.height,
      width: NATURAL.width,
      height: NATURAL.height,
      toJSON: () => ({}),
    }) as DOMRect;
  restoreRect = () => {
    Element.prototype.getBoundingClientRect = originalRect;
  };

  const widthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'naturalWidth'
  );
  const heightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'naturalHeight'
  );
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => NATURAL.width,
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
    configurable: true,
    get: () => NATURAL.height,
  });
  restoreNatural = () => {
    if (widthDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', widthDescriptor);
    }
    if (heightDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', heightDescriptor);
    }
  };
});

afterAll(() => {
  restoreRect();
  restoreNatural();
});

const renderEditor = async ({
  canSaveAsCopy = true,
  asset: assetProp = asset,
}: { canSaveAsCopy?: boolean; asset?: AssetWithPopulatedCreatedBy } = {}) => {
  const utils = render(
    <AssetCropEditor
      asset={assetProp}
      onClose={jest.fn()}
      onApply={jest.fn()}
      onSaveAsCopy={jest.fn()}
      canSaveAsCopy={canSaveAsCopy}
    />
  );

  // Seed the crop state: the editor only initialises once the image loads.
  const image = document.querySelector('img') as HTMLImageElement;
  fireEvent.load(image);

  const focalHandle = await screen.findByRole('button', { name: 'Focal point' });

  return { ...utils, focalHandle };
};

// `touch-action: none` on the drag surfaces is the other half of this fix
// (stops mobile browsers from claiming the gesture for scrolling, which fires
// pointercancel mid-drag) — jsdom's CSSOM drops the property, so it can't be
// asserted here.
describe('AssetCropEditor focus on open', () => {
  it('focuses the overlay container instead of the first field (keyboard would pop on mobile)', async () => {
    await renderEditor();

    const active = document.activeElement as HTMLElement;
    expect(active.tagName).not.toBe('INPUT');
    expect(active).toHaveAttribute('tabindex', '-1');
  });
});

describe('AssetCropEditor pointer drags', () => {
  it('follows the pointer for the whole focal-point drag', async () => {
    const { focalHandle } = await renderEditor();

    fireEvent(
      focalHandle,
      pointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 300 })
    );
    fireEvent(window, pointerEvent('pointermove', { pointerId: 1, clientX: 600, clientY: 450 }));

    // 600/800 and 450/600 of the full-image crop → 75% on both axes.
    expect(focalHandle).toHaveStyle({ left: '75%', top: '75%' });

    fireEvent(window, pointerEvent('pointerup', { pointerId: 1, clientX: 600, clientY: 450 }));
  });

  it('stops the drag on pointercancel and ignores later moves', async () => {
    const { focalHandle } = await renderEditor();

    fireEvent(
      focalHandle,
      pointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 300 })
    );
    fireEvent(window, pointerEvent('pointermove', { pointerId: 1, clientX: 600, clientY: 450 }));
    fireEvent(window, pointerEvent('pointercancel', { pointerId: 1 }));

    // The gesture ended — a move from a later touch must not drag the handle.
    fireEvent(window, pointerEvent('pointermove', { pointerId: 1, clientX: 80, clientY: 60 }));

    expect(focalHandle).toHaveStyle({ left: '75%', top: '75%' });
  });

  it('ignores moves from other concurrent pointers', async () => {
    const { focalHandle } = await renderEditor();

    fireEvent(
      focalHandle,
      pointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 300 })
    );
    // A second finger lands elsewhere — its moves must not steal the drag.
    fireEvent(window, pointerEvent('pointermove', { pointerId: 2, clientX: 80, clientY: 60 }));

    expect(focalHandle).toHaveStyle({ left: '50%', top: '50%' });

    fireEvent(window, pointerEvent('pointerup', { pointerId: 1, clientX: 400, clientY: 300 }));
  });
});

describe('AssetCropEditor save-as-copy gating', () => {
  it('shows "Save as copy" when the user can create assets', async () => {
    await renderEditor({ canSaveAsCopy: true });

    expect(screen.getByRole('button', { name: 'Save as copy' })).toBeInTheDocument();
    // Apply (crop in place = assets.update) is always present.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('hides "Save as copy" without create permission, keeping Apply', async () => {
    await renderEditor({ canSaveAsCopy: false });

    expect(screen.queryByRole('button', { name: 'Save as copy' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });
});

describe('AssetCropEditor cache-buster on signed URLs', () => {
  const signedAsset = {
    ...asset,
    isUrlSigned: true,
    // A presigned S3 URL already carries its signature as query params; a
    // `&v=` cache-buster would invalidate it (403 SignatureDoesNotMatch).
    url: 'https://cdn.example.com/photo.png?X-Amz-Signature=sig',
  } as unknown as AssetWithPopulatedCreatedBy;

  const unsignedAsset = {
    ...asset,
    isUrlSigned: false,
    url: '/uploads/photo.png',
    updatedAt: '2026-05-06T00:00:00.000Z',
  } as unknown as AssetWithPopulatedCreatedBy;

  it('does not append the cache-buster on a signed URL (preserves the signature)', async () => {
    await renderEditor({ asset: signedAsset });

    const src = document.querySelector('img')?.getAttribute('src') ?? '';
    expect(src).toBe(signedAsset.url);
    expect(src).not.toContain('v=');
  });

  it('busts an unsigned URL with a distinct `updatedAt` param (still refreshes after replace)', async () => {
    await renderEditor({ asset: unsignedAsset });

    const src = document.querySelector('img')?.getAttribute('src') ?? '';
    expect(src).toContain(`updatedAt=${new Date(unsignedAsset.updatedAt as string).getTime()}`);
  });

  it('produces the same URL and crossOrigin as AssetPreview for a signed asset (one CORS-consistent cache entry)', async () => {
    // AssetPreview is the sibling render site; for a signed asset both must drop
    // the buster and opt into CORS, or the two loads would fight over the cache
    // (the #26581 collision).
    const preview = render(<AssetPreview asset={signedAsset} />);
    // Select by alt (the real image), not the first <img> — AssetPreview also
    // renders a loading-spinner SVG <img> until the media load fires.
    const previewImg = preview.getByAltText(String(signedAsset.alternativeText));
    const previewSrc = previewImg.getAttribute('src');
    const previewCrossOrigin = previewImg.getAttribute('crossorigin');
    preview.unmount();

    await renderEditor({ asset: signedAsset });
    const cropImg = screen.getByAltText(signedAsset.name) as HTMLImageElement;

    expect(cropImg).toHaveAttribute('src', previewSrc as string);
    expect(cropImg).toHaveAttribute('crossorigin', previewCrossOrigin as string);
    expect(previewCrossOrigin).toBe('anonymous');
  });

  it('gives the crop image its own cache entry for an unsigned asset (distinct URL + anonymous)', async () => {
    // The editor reads canvas pixels (useCropImg -> toBlob), so it must load
    // CORS-clean (crossOrigin="anonymous"); AssetPreview only displays and leaves
    // it unset. Same URL + different crossOrigin collide (#26581) — the anonymous
    // crop request could reuse the thumbnail's non-CORS response and taint the
    // canvas. So the crop URL must differ: it busts with `updatedAt`, the
    // thumbnail with `v`.
    const preview = render(<AssetPreview asset={unsignedAsset} />);
    const previewImg = preview.getByAltText(String(unsignedAsset.alternativeText));
    const previewSrc = previewImg.getAttribute('src') ?? '';
    expect(previewImg).not.toHaveAttribute('crossorigin');
    preview.unmount();

    await renderEditor({ asset: unsignedAsset });
    const cropImg = screen.getByAltText(unsignedAsset.name) as HTMLImageElement;
    const cropSrc = cropImg.getAttribute('src') ?? '';

    // Distinct cache entry: different URL, and the crop opts into CORS.
    expect(cropSrc).not.toBe(previewSrc);
    expect(cropSrc).toContain('updatedAt=');
    expect(previewSrc).toContain('v=');
    expect(cropImg).toHaveAttribute('crossorigin', 'anonymous');
  });
});

describe('AssetCropEditor drag cleanup on unmount', () => {
  it('removes window drag listeners when unmounted mid-drag', async () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { focalHandle, unmount } = await renderEditor();

    // Start a drag but never release it.
    fireEvent(
      focalHandle,
      pointerEvent('pointerdown', { pointerId: 1, clientX: 400, clientY: 300 })
    );

    unmount();

    // The unmount cleanup must tear down all three window listeners so a stale
    // onMove can't fire on the unmounted component.
    for (const type of ['pointermove', 'pointerup', 'pointercancel']) {
      expect(removeSpy).toHaveBeenCalledWith(type, expect.any(Function));
    }

    removeSpy.mockRestore();
  });
});
