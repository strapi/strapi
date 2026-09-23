import { resolveCornerResize } from '../useCropImg';

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
