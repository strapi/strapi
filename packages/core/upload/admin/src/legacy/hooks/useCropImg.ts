import * as React from 'react';

import Cropper from 'cropperjs';

const QUALITY = 1;

type Size = {
  width?: number;
  height?: number;
};

type Resize = {
  detail: {
    height: number;
    width: number;
  };
};

export const useCropImg = () => {
  const cropperRef = React.useRef<Cropper>();
  const [isCropping, setIsCropping] = React.useState(false);
  const [size, setSize] = React.useState<Size>({ width: undefined, height: undefined });

  React.useEffect(() => {
    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }
    };
  }, []);

  const handleResize = ({ detail: { height, width } }: Resize) => {
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
        checkCrossOrigin: false,
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
    new Promise((resolve, reject) => {
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
