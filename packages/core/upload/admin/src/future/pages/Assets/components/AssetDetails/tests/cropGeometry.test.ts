import { nextRotation, resolveCornerResize, rotateCropRect, sourceCropRect } from '../useCropImg';

describe('resolveCornerResize', () => {
  describe('free resize (no aspect lock)', () => {
    it('keeps the anchor as the opposite corner when dragging bottom-right from a top-left anchor', () => {
      const rect = resolveCornerResize({
        anchorX: 0,
        anchorY: 0,
        point: { x: 100, y: 50 },
        aspectRatio: null,
      });

      expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    });

    it('keeps the bottom-right anchor fixed when dragging the top-left corner inward', () => {
      const rect = resolveCornerResize({
        anchorX: 100,
        anchorY: 50,
        point: { x: 10, y: 10 },
        aspectRatio: null,
      });

      expect(rect).toEqual({ x: 10, y: 10, width: 90, height: 40 });
      // opposite (anchored) corner is unchanged
      expect(rect.x + rect.width).toBe(100);
      expect(rect.y + rect.height).toBe(50);
    });
  });

  describe('aspect-locked resize', () => {
    it('snaps height to the 2:1 ratio and keeps the top-left anchor fixed', () => {
      const rect = resolveCornerResize({
        anchorX: 0,
        anchorY: 0,
        point: { x: 100, y: 40 },
        aspectRatio: 2,
      });

      // width dominates (100/2=50 >= 40) → height becomes 50
      expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 50 });
      expect(rect.width / rect.height).toBe(2);
    });

    it('keeps the opposite corner fixed AND the ratio when dragging the top-left corner', () => {
      const rect = resolveCornerResize({
        anchorX: 100,
        anchorY: 50,
        point: { x: 10, y: 10 },
        aspectRatio: 2,
      });

      // raw w=90 h=40 → 90/2=45 >= 40 → h=45, x/y derived from the anchor
      expect(rect).toEqual({ x: 10, y: 5, width: 90, height: 45 });
      // the anchored (bottom-right) corner must not move
      expect(rect.x + rect.width).toBe(100);
      expect(rect.y + rect.height).toBe(50);
      // ratio preserved
      expect(rect.width / rect.height).toBe(2);
    });

    it('lets the taller drag drive the width', () => {
      const rect = resolveCornerResize({
        anchorX: 0,
        anchorY: 0,
        point: { x: 30, y: 100 },
        aspectRatio: 2,
      });

      // height dominates (30/2=15 < 100) → width becomes 200
      expect(rect).toEqual({ x: 0, y: 0, width: 200, height: 100 });
      expect(rect.width / rect.height).toBe(2);
    });
  });
});

describe('rotateCropRect', () => {
  // A 100x60 image with a rect hugging the top-left, deliberately asymmetric on
  // both axes so a wrong sign or a swapped axis cannot pass by coincidence.
  const size = { width: 100, height: 60 };
  const crop = { x: 10, y: 5, width: 30, height: 20 };

  it('maps the rect into the swapped space on a right turn', () => {
    // Top-left of the image lands top-right, so x is measured from the far edge.
    expect(rotateCropRect(crop, 'right', size)).toEqual({
      x: 60 - (5 + 20),
      y: 10,
      width: 20,
      height: 30,
    });
  });

  it('maps the rect into the swapped space on a left turn', () => {
    expect(rotateCropRect(crop, 'left', size)).toEqual({
      x: 5,
      y: 100 - (10 + 30),
      width: 20,
      height: 30,
    });
  });

  it('returns to the original rect after four turns in either direction', () => {
    for (const direction of ['left', 'right'] as const) {
      let rect = crop;
      let current = size;

      for (let turn = 0; turn < 4; turn += 1) {
        rect = rotateCropRect(rect, direction, current);
        current = { width: current.height, height: current.width };
      }

      expect(rect).toEqual(crop);
      expect(current).toEqual(size);
    }
  });

  it('is reversible by the opposite turn', () => {
    const turned = rotateCropRect(crop, 'right', size);
    const back = rotateCropRect(turned, 'left', { width: size.height, height: size.width });

    expect(back).toEqual(crop);
  });

  it('keeps the rect inside the rotated bounds', () => {
    const turned = rotateCropRect(crop, 'right', size);

    expect(turned.x).toBeGreaterThanOrEqual(0);
    expect(turned.y).toBeGreaterThanOrEqual(0);
    expect(turned.x + turned.width).toBeLessThanOrEqual(size.height);
    expect(turned.y + turned.height).toBeLessThanOrEqual(size.width);
  });
});

describe('sourceCropRect', () => {
  const size = { width: 100, height: 60 };
  const crop = { x: 10, y: 5, width: 30, height: 20 };

  it('is the identity when nothing was rotated', () => {
    expect(sourceCropRect(crop, 0, size)).toEqual(crop);
  });

  it.each([90, 180, 270] as const)('undoes %s degrees back to the source rect', (rotation) => {
    // Rotate the rect forward by the same amount, then ask for the source rect
    // back: the round trip must land on the rect we started from.
    let rotated = crop;
    let rotatedSize = size;

    for (let turn = 0; turn < rotation / 90; turn += 1) {
      rotated = rotateCropRect(rotated, 'right', rotatedSize);
      rotatedSize = { width: rotatedSize.height, height: rotatedSize.width };
    }

    expect(sourceCropRect(rotated, rotation, rotatedSize)).toEqual(crop);
  });
});

describe('nextRotation', () => {
  it('advances and wraps in both directions', () => {
    expect(nextRotation(0, 'right')).toBe(90);
    expect(nextRotation(270, 'right')).toBe(0);
    expect(nextRotation(0, 'left')).toBe(270);
    expect(nextRotation(90, 'left')).toBe(0);
  });
});
