export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif';

export type JobStatus = 'idle' | 'queued' | 'processing' | 'complete' | 'error' | 'cancelled';

export type Tool = 'remove' | 'keep' | 'eraser';

export type View = 'remove-bg' | 'resize' | 'upscale' | 'convert' | 'compress' | 'history';

export type CompressionMode = 'balanced' | 'smallest' | 'quality';

export type ResampleMethod = 'lanczos' | 'bilinear' | 'bicubic' | 'nearest';

export type ResizeMode = 'pixel' | 'percentage' | 'preset';

export type PerformanceMode = 'balanced' | 'speed' | 'quality';

export interface ImageFile {
  id: string;
  file: File;
  name: string;
  width: number;
  height: number;
  size: number;
  type: string;
  thumbnail: string;
  originalData?: ImageData;
}

export interface ProcessingJob {
  id: string;
  imageId: string;
  status: JobStatus;
  progress: number;
  error?: string;
  result?: ProcessingResult;
  settings: ProcessingSettings;
  startTime?: number;
  endTime?: number;
  retries: number;
}

export interface ProcessingResult {
  imageData: ImageData;
  maskData: ImageData;
  processedBlob?: Blob;
  transparentBlob?: Blob;
}

export interface ProcessingSettings {
  threshold: number;
  edgeRefine: boolean;
  denoise: boolean;
  feather: number;
  invertMask: boolean;
  smooth: number;
  contrast: number;
}

export interface ResizeSettings {
  mode: ResizeMode;
  width: number;
  height: number;
  percentage: number;
  preset: string;
  resampleMethod: ResampleMethod;
  quality: number;
  maintainAspectRatio: boolean;
  maintainMetadata: boolean;
}

export interface CompressSettings {
  mode: CompressionMode;
  qualityLevel: number;
  outputFormat: string;
  removeMetadata: boolean;
  optimizeForWeb: boolean;
  convertTo: string;
}

export interface UpscaleSettings {
  scale: number;
  aiEnhancement: boolean;
  enhancementModel: string;
  noiseReduction: number;
  sharpness: number;
  recoverDetails: number;
  outputFormat: ImageFormat;
  quality: number;
  maintainMetadata: boolean;
}

export interface ConversionSettings {
  format: ImageFormat;
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  backgroundColor: string;
  preserveTransparency: boolean;
}

export interface ExportSettings extends ConversionSettings {
  backgroundEnabled: boolean;
}

export interface EditOperation {
  tool: Tool;
  points: Point[];
  brushSize: number;
  imageData?: ImageData;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  comparisonPosition: number;
  showCheckerboard: boolean;
}

export interface ToolFile {
  id: string;
  file: File;
  name: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
  status: string;
  result?: Blob;
  resultSize?: number;
  savings?: number;
}

export interface AppState {
  currentView: View;
  images: Map<string, ImageFile>;
  jobs: Map<string, ProcessingJob>;
  queue: string[];
  currentImageId: string | null;
  currentJobId: string | null;
  editHistory: EditOperation[];
  editHistoryIndex: number;
  settings: ProcessingSettings;
  resizeSettings: ResizeSettings;
  compressSettings: CompressSettings;
  upscaleSettings: UpscaleSettings;
  conversionSettings: ConversionSettings;
  canvasState: CanvasState;
  isProcessing: boolean;
  performanceMode: PerformanceMode;
}

export interface WorkerMessage {
  type: string;
  payload: any;
  id?: string;
}

export interface PerformanceMetrics {
  uploadTime: number;
  processingTime: number;
  totalTime: number;
  throughput: number;
  startTime: number;
}
