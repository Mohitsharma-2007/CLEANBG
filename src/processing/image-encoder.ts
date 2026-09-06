import type { ImageFormat, ConversionSettings } from '../core/types';

export function encodeImage(
  imageData: ImageData,
  format: ImageFormat,
  quality: number = 0.92,
  width?: number,
  height?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width || imageData.width;
    canvas.height = height || imageData.height;
    const ctx = canvas.getContext('2d')!;

    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode ${format}`));
      },
      mimeType,
      quality
    );
  });
}

export function encodeImageWithBackground(
  imageData: ImageData,
  format: ImageFormat,
  quality: number,
  backgroundColor: string,
  width?: number,
  height?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width || imageData.width;
    canvas.height = height || imageData.height;
    const ctx = canvas.getContext('2d')!;

    if (format !== 'png' || backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode ${format}`));
      },
      mimeType,
      quality
    );
  });
}

export function convertFormat(
  sourceBlob: Blob,
  targetFormat: ImageFormat,
  quality: number = 0.92,
  width?: number,
  height?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(sourceBlob);
    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width = width || img.naturalWidth;
      canvas.height = height || img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      if (targetFormat === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : `image/${targetFormat}`;
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`Conversion to ${targetFormat} failed`));
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load source image'));
    };
    img.src = url;
  });
}

export function estimateFileSize(
  width: number,
  height: number,
  format: ImageFormat,
  quality: number
): number {
  const pixels = width * height;
  const bytesPerPixel: Record<ImageFormat, number> = {
    png: 3,
    jpeg: quality < 0.5 ? 0.3 : quality < 0.8 ? 0.8 : 1.5,
    webp: quality < 0.5 ? 0.2 : quality < 0.8 ? 0.5 : 1,
    gif: 1.2,
  };
  return Math.round(pixels * (bytesPerPixel[format] || 1));
}

export function resizeImageData(
  imageData: ImageData,
  newWidth: number,
  newHeight: number
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = newWidth;
  targetCanvas.height = newHeight;
  const targetCtx = targetCanvas.getContext('2d')!;
  targetCtx.drawImage(canvas, 0, 0, newWidth, newHeight);

  return targetCtx.getImageData(0, 0, newWidth, newHeight);
}
