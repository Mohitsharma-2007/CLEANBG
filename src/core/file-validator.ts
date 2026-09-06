const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DIMENSION = 8192;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): ValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported format: ${file.type || 'unknown'}. Use PNG, JPG, or WebP.` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB.` };
  }
  return { valid: true };
}

export function validateImage(img: HTMLImageElement): ValidationResult {
  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
    return { valid: false, error: 'Invalid image: could not read dimensions.' };
  }
  if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
    return { valid: false, error: `Image too large: ${img.naturalWidth}×${img.naturalHeight}. Max: ${MAX_DIMENSION}×${MAX_DIMENSION}.` };
  }
  return { valid: true };
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image. File may be corrupted.'));
    };
    img.src = url;
  });
}

export function fileToImageData(file: File, img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read image dimensions'));
    };
    img.src = url;
  });
}
