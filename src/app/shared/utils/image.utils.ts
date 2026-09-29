/**
 * Crops an image file to a centered square and scales it down to `size` pixels, as a JPEG.
 * Profile photos are only ever shown small, so this keeps uploads to a few tens of KB
 * whatever the camera produced. Rejects if the browser can't decode the file as an image.
 */
export async function resizeToSquare(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const target = Math.min(size, side);

    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not supported.');
    }
    // JPEG has no transparency - give transparent PNGs a white background instead of black.
    context.fillStyle = '#fff';
    context.fillRect(0, 0, target, target);
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))), 'image/jpeg', 0.88)
    );
  } finally {
    bitmap.close();
  }
}
