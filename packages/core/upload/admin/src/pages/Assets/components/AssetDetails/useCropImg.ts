import * as React from 'react';

const QUALITY = 1;

interface NaturalSize {
  width: number;
  height: number;
}

export interface CropRect {
  /** Origin in natural-px from the image top-left. */
  x: number;
  y: number;
  /** Crop area dimensions in natural px. */
  width: number;
  height: number;
}

/**
 * Resolve a corner-resize drag into a crop rect, keeping the opposite corner
 * (`anchor`) fixed. When `aspectRatio` is set, one dimension is snapped to the
 * ratio first (driven by whichever axis the pointer pushed furthest), then the
 * position is derived from the anchor — so a locked resize never drifts the
 * anchored corner. Pure (no clamping to image bounds; the caller clamps).
 */
export const resolveCornerResize = ({
  anchorX,
  anchorY,
  point,
  aspectRatio,
}: {
  anchorX: number;
  anchorY: number;
  point: { x: number; y: number };
  aspectRatio: number | null;
}): CropRect => {
  let width = Math.abs(point.x - anchorX);
  let height = Math.abs(point.y - anchorY);

  if (aspectRatio) {
    if (width / aspectRatio >= height) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  }

  const x = point.x < anchorX ? anchorX - width : anchorX;
  const y = point.y < anchorY ? anchorY - height : anchorY;

  return { x, y, width, height };
};

export type Rotation = 0 | 90 | 180 | 270;

/**
 * Remap a crop rect through a quarter-turn. `size` is the image size *before* the
 * turn, so the returned rect is expressed against the swapped size for 90/270.
 * Pure: the caller swaps `naturalSize` to match.
 */
export const rotateCropRect = (
  crop: CropRect,
  direction: 'left' | 'right',
  size: NaturalSize
): CropRect =>
  direction === 'right'
    ? {
        x: size.height - (crop.y + crop.height),
        y: crop.x,
        width: crop.height,
        height: crop.width,
      }
    : {
        x: crop.y,
        y: size.width - (crop.x + crop.width),
        width: crop.height,
        height: crop.width,
      };

/**
 * The crop rect expressed against the *unrotated* source, by undoing each quarter-turn
 * already applied. `produceFile` needs it to know which source pixels to sample.
 */
export const sourceCropRect = (
  crop: CropRect,
  rotation: Rotation,
  rotatedSize: NaturalSize
): CropRect => {
  let rect = crop;
  let size = rotatedSize;

  for (let turn = 0; turn < rotation / 90; turn += 1) {
    rect = rotateCropRect(rect, 'left', size);
    size = { width: size.height, height: size.width };
  }

  return rect;
};

/** Advance a rotation by one quarter-turn, wrapping at 360. */
export const nextRotation = (current: Rotation, direction: 'left' | 'right'): Rotation =>
  ((current + (direction === 'right' ? 90 : 270)) % 360) as Rotation;

/**
 * Custom crop state + file producer. Replaces a cropperjs-based version: the
 * crop rectangle is stored in natural-image pixels (so it stays locked across
 * window resizes), and `AssetCropEditor` overlays a div sized by
 * (cropNatural × displayRatio). produceFile draws the natural-px crop region
 * straight to a canvas.
 */
export const useCropImg = () => {
  const [naturalSize, setNaturalSize] = React.useState<NaturalSize>({ width: 0, height: 0 });
  const [crop, setCrop] = React.useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectRatio, setAspectRatioState] = React.useState<number | null>(null);
  const [rotation, setRotation] = React.useState<Rotation>(0);
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  /**
   * Call from the <img> onLoad handler. Captures the natural dimensions and
   * seeds the crop to the full image (auto-crop area = 1).
   */
  const init = React.useCallback((image: HTMLImageElement) => {
    imageRef.current = image;
    const next: NaturalSize = { width: image.naturalWidth, height: image.naturalHeight };
    setNaturalSize(next);
    setCrop({ x: 0, y: 0, width: next.width, height: next.height });
    setRotation(0);
  }, []);

  /**
   * Turn the image a quarter-turn. `naturalSize` swaps and the crop rect is remapped
   * so the same pixels stay selected; nothing is reset.
   */
  const rotate = React.useCallback(
    (direction: 'left' | 'right') => {
      setCrop((prev) => rotateCropRect(prev, direction, naturalSize));
      setNaturalSize((prev) => ({ width: prev.height, height: prev.width }));
      setRotation((prev) => nextRotation(prev, direction));
      // A locked ratio describes the orientation it was locked in, so a quarter
      // turn inverts it. Without this it keeps enforcing the pre-rotation shape
      // and fights every later resize.
      setAspectRatioState((prev) => (prev ? 1 / prev : prev));
    },
    [naturalSize]
  );

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  /** Update crop dimensions, clamping to remain inside the image bounds. */
  const setCropSize = React.useCallback(
    (next: Partial<Pick<CropRect, 'width' | 'height'>>) => {
      setCrop((prev) => {
        const maxW = naturalSize.width - prev.x;
        const maxH = naturalSize.height - prev.y;
        let width = next.width !== undefined ? clamp(next.width, 1, maxW) : prev.width;
        let height = next.height !== undefined ? clamp(next.height, 1, maxH) : prev.height;

        if (aspectRatio) {
          // When aspect locked, the axis the user is editing wins; the other
          // axis follows. If both changed in one call, prefer width.
          if (next.width !== undefined) {
            height = clamp(width / aspectRatio, 1, maxH);
          } else if (next.height !== undefined) {
            width = clamp(height * aspectRatio, 1, maxW);
          }
        }

        return { ...prev, width, height };
      });
    },
    [naturalSize.width, naturalSize.height, aspectRatio]
  );

  /** Update crop origin, clamping so the crop stays inside the image. */
  const setCropPosition = React.useCallback(
    (next: Partial<Pick<CropRect, 'x' | 'y'>>) => {
      setCrop((prev) => {
        const x = next.x !== undefined ? clamp(next.x, 0, naturalSize.width - prev.width) : prev.x;
        const y =
          next.y !== undefined ? clamp(next.y, 0, naturalSize.height - prev.height) : prev.y;
        return { ...prev, x, y };
      });
    },
    [naturalSize.width, naturalSize.height]
  );

  /** Lock or release the crop aspect ratio. Pass `null` to free it. */
  const setAspectRatio = React.useCallback(
    (ratio: number | null) => {
      setAspectRatioState(ratio);
      if (ratio) {
        setCrop((prev) => {
          // Bring the current rect into the requested ratio without escaping
          // the image bounds.
          const maxW = naturalSize.width - prev.x;
          const maxH = naturalSize.height - prev.y;
          let width = prev.width;
          let height = width / ratio;
          if (height > maxH) {
            height = maxH;
            width = height * ratio;
          }
          if (width > maxW) {
            width = maxW;
            height = width / ratio;
          }
          return { ...prev, width: Math.round(width), height: Math.round(height) };
        });
      }
    },
    [naturalSize.width, naturalSize.height]
  );

  /**
   * Draw the crop region from the loaded image element straight to a canvas
   * and produce a File. The image must be CORS-clean (set crossOrigin on the
   * <img>); otherwise canvas.toBlob throws on tainted canvas.
   */
  const produceFile = React.useCallback(
    (name: string, mimeType: string, lastModifiedDate?: string): Promise<globalThis.File> =>
      new Promise((resolve, reject) => {
        const image = imageRef.current;
        if (!image) {
          reject(new Error('Image not ready: call init() before produceFile().'));
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(crop.width));
        canvas.height = Math.max(1, Math.round(crop.height));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not get a 2D canvas context to crop the image.'));
          return;
        }
        const source = sourceCropRect(crop, rotation, naturalSize);

        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((rotation * Math.PI) / 180);
        context.drawImage(
          image,
          source.x,
          source.y,
          source.width,
          source.height,
          -source.width / 2,
          -source.height / 2,
          source.width,
          source.height
        );
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not export the cropped image to a blob.'));
              return;
            }
            resolve(
              new File([blob], name, {
                type: mimeType,
                lastModified: lastModifiedDate ? new Date(lastModifiedDate).getTime() : Date.now(),
              })
            );
          },
          mimeType,
          QUALITY
        );
      }),
    [crop, rotation, naturalSize]
  );

  return {
    init,
    crop,
    naturalSize,
    rotation,
    rotate,
    aspectRatio,
    setCropSize,
    setCropPosition,
    setAspectRatio,
    produceFile,
    // Round-aware getters for the px inputs.
    width: Math.round(crop.width),
    height: Math.round(crop.height),
  };
};
