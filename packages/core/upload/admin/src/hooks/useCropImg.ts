import * as React from 'react';

import Cropper from 'cropperjs';

const QUALITY = 1;

export const useCropImg = () => {
  const cropperRef = React.useRef<Cropper>();
  const [isCropping, setIsCropping] = React.useState(false);
  const [size, setSize] = React.useState<{
    width?: number;
    height?: number;
  }>({ width: undefined, height: undefined });

  React.useEffect(() => {
    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }
    };
  }, []);

  const handleResize = ({
    detail: { height, width },
  }: {
    detail: { height: number; width: number };
  }) => {
    const roundedDataWidth = Math.round(width);
    const roundedDataHeight = Math.round(height);

    setSize({ width: roundedDataWidth, height: roundedDataHeight });
  };

  const crop = (image: HTMLImageElement) => {
    if (!cropperRef.current) {
      cropperRef.current = new Cropper(image, {
        modal: true,
        initialAspectRatio: 16 / 9,
        movable: true,
        zoomable: false,
        cropBoxResizable: true,
        background: false,
        crop: handleResize,
      });

      setIsCropping(true);
    }
  };

  const stopCropping = () => {
    if (cropperRef.current) {
      cropperRef.current.destroy();
      cropperRef.current = undefined;
      setIsCropping(false);
    }
  };

  const produceFile = (name: string, mimeType: string, lastModifiedDate: string) =>
    new Promise<File>((resolve, reject) => {
      if (!cropperRef.current) {
        reject(
          new Error(
            'The cropper has not been instantiated: make sure to call the crop() function before calling produceFile().'
          )
        );
      } else {
        const canvas = cropperRef.current.getCroppedCanvas();

        canvas.toBlob(
          (blob) => {
            resolve(
              new File([blob!], name, {
                type: mimeType,
                lastModified: new Date(lastModifiedDate).getTime(),
              })
            );
          },
          mimeType,
          QUALITY
        );
      }
    });

  return {
    crop,
    produceFile,
    stopCropping,
    isCropping,
    isCropperReady: Boolean(cropperRef.current),
    ...size,
  };
};
