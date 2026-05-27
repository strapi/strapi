import * as React from 'react';

import Cropper from 'cropperjs';

const QUALITY = 1;

interface CropSize {
  width: number;
  height: number;
}

/**
 * Wraps a `cropperjs` instance for the future crop editor. Mounts on an
 * <img>, tracks the selected crop area in natural pixels, and produces the
 * cropped file. Focal-point handling lives in the editor component — this
 * hook only owns the crop rectangle.
 */
export const useCropImg = () => {
  const cropperRef = React.useRef<Cropper>();
  const [isCropperReady, setIsCropperReady] = React.useState(false);
  const [size, setSize] = React.useState<CropSize>({ width: 0, height: 0 });

  React.useEffect(() => {
    return () => {
      cropperRef.current?.destroy();
      cropperRef.current = undefined;
    };
  }, []);

  const crop = React.useCallback((image: HTMLImageElement) => {
    if (cropperRef.current) {
      return;
    }
    cropperRef.current = new Cropper(image, {
      modal: true,
      autoCropArea: 1,
      movable: false,
      zoomable: false,
      cropBoxResizable: true,
      background: false,
      checkCrossOrigin: false,
      ready() {
        setIsCropperReady(true);
        const data = cropperRef.current?.getData(true);
        if (data) {
          setSize({ width: Math.round(data.width), height: Math.round(data.height) });
        }
      },
      crop({ detail }) {
        setSize({ width: Math.round(detail.width), height: Math.round(detail.height) });
      },
    });
  }, []);

  const stopCropping = React.useCallback(() => {
    cropperRef.current?.destroy();
    cropperRef.current = undefined;
    setIsCropperReady(false);
  }, []);

  /** Set the crop area dimensions (natural px) from the manual inputs. */
  const setCropSize = React.useCallback((next: Partial<CropSize>) => {
    cropperRef.current?.setData({ ...next });
  }, []);

  /** Lock or release the crop box aspect ratio. Pass `null` to free it. */
  const setAspectRatio = React.useCallback((ratio: number | null) => {
    cropperRef.current?.setAspectRatio(ratio ?? NaN);
  }, []);

  /** Crop box rect in container display px — used to overlay the focal point. */
  const getCropBoxData = React.useCallback(() => cropperRef.current?.getCropBoxData() ?? null, []);

  const produceFile = React.useCallback(
    (name: string, mimeType: string, lastModifiedDate?: string): Promise<globalThis.File> =>
      new Promise((resolve, reject) => {
        if (!cropperRef.current) {
          reject(new Error('Cropper not instantiated: call crop() before produceFile().'));
          return;
        }
        cropperRef.current.getCroppedCanvas().toBlob(
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
    []
  );

  return {
    crop,
    stopCropping,
    produceFile,
    setCropSize,
    setAspectRatio,
    getCropBoxData,
    isCropperReady,
    width: size.width,
    height: size.height,
  };
};
