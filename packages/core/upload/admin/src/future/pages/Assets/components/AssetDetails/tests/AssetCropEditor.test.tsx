import { fireEvent, render, screen } from '@tests/utils';

import { AssetCropEditor } from '../AssetCropEditor';

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

const renderEditor = async ({ canSaveAsCopy = true }: { canSaveAsCopy?: boolean } = {}) => {
  const utils = render(
    <AssetCropEditor
      asset={asset}
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
