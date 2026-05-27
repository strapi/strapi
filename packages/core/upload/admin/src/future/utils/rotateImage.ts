/**
 * Load an image URL into an <img> element. `crossOrigin = 'anonymous'` keeps
 * the canvas un-tainted so `toBlob` works when the file is served from the
 * upload provider (same constraint the legacy cropper relies on).
 */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

/**
 * Produce a new `File` containing `src` rotated clockwise by `degrees`
 * (expects multiples of 90). The canvas dimensions swap for 90°/270° so the
 * rotated image isn't clipped.
 *
 * Returns the browser `File` type (`globalThis.File`) — the upload contract
 * also exports a `File` type that shadows it in service modules.
 */
export const rotateImage = async (
  src: string,
  degrees: number,
  name: string,
  mimeType: string
): Promise<globalThis.File> => {
  const normalized = ((degrees % 360) + 360) % 360;
  const image = await loadImage(src);

  const swapsAxes = normalized === 90 || normalized === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swapsAxes ? image.naturalHeight : image.naturalWidth;
  canvas.height = swapsAxes ? image.naturalWidth : image.naturalHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get a 2D canvas context to rotate the image.');
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalized * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 1));
  if (!blob) {
    throw new Error('Could not export the rotated image to a blob.');
  }

  return new File([blob], name, { type: mimeType });
};
