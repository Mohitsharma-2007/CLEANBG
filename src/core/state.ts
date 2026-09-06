import type {
  ImageFile, ProcessingJob, ProcessingSettings, ConversionSettings,
  ResizeSettings, CompressSettings, UpscaleSettings,
  AppState, CanvasState, PerformanceMode, View
} from './types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDefaultSettings(): ProcessingSettings {
  return {
    threshold: 30,
    edgeRefine: true,
    denoise: true,
    feather: 10,
    invertMask: false,
    smooth: 25,
    contrast: 0,
  };
}

function getDefaultResizeSettings(): ResizeSettings {
  return {
    mode: 'pixel',
    width: 1920,
    height: 1080,
    percentage: 100,
    preset: '',
    resampleMethod: 'lanczos',
    quality: 90,
    maintainAspectRatio: true,
    maintainMetadata: true,
  };
}

function getDefaultCompressSettings(): CompressSettings {
  return {
    mode: 'balanced',
    qualityLevel: 80,
    outputFormat: 'auto',
    removeMetadata: true,
    optimizeForWeb: true,
    convertTo: 'auto',
  };
}

function getDefaultUpscaleSettings(): UpscaleSettings {
  return {
    scale: 4,
    aiEnhancement: true,
    enhancementModel: 'standard',
    noiseReduction: 25,
    sharpness: 40,
    recoverDetails: 60,
    outputFormat: 'png',
    quality: 100,
    maintainMetadata: true,
  };
}

function getDefaultConversionSettings(): ConversionSettings {
  return {
    format: 'webp',
    quality: 90,
    maintainAspectRatio: true,
    backgroundColor: '#ffffff',
    preserveTransparency: true,
  };
}

function getDefaultCanvasState(): CanvasState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    comparisonPosition: 50,
    showCheckerboard: true,
  };
}

class State {
  private state: AppState = {
    currentView: 'remove-bg',
    images: new Map(),
    jobs: new Map(),
    queue: [],
    currentImageId: null,
    currentJobId: null,
    editHistory: [],
    editHistoryIndex: -1,
    settings: getDefaultSettings(),
    resizeSettings: getDefaultResizeSettings(),
    compressSettings: getDefaultCompressSettings(),
    upscaleSettings: getDefaultUpscaleSettings(),
    conversionSettings: getDefaultConversionSettings(),
    canvasState: getDefaultCanvasState(),
    isProcessing: false,
    performanceMode: 'balanced',
  };

  get(): Readonly<AppState> {
    return this.state;
  }

  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    (this.state as any)[key] = value;
  }

  generateId(): string {
    return generateId();
  }

  addImage(file: File, img: HTMLImageElement): ImageFile {
    const id = generateId();
    const imageFile: ImageFile = {
      id,
      file,
      name: file.name,
      width: img.naturalWidth,
      height: img.naturalHeight,
      size: file.size,
      type: file.type,
      thumbnail: URL.createObjectURL(file),
    };
    this.state.images.set(id, imageFile);
    return imageFile;
  }

  removeImage(id: string): void {
    const img = this.state.images.get(id);
    if (img?.thumbnail) URL.revokeObjectURL(img.thumbnail);
    this.state.images.delete(id);
    this.state.jobs.delete(id);
    const idx = this.state.queue.indexOf(id);
    if (idx >= 0) this.state.queue.splice(idx, 1);
  }

  createJob(imageId: string): ProcessingJob {
    const job: ProcessingJob = {
      id: generateId(),
      imageId,
      status: 'queued',
      progress: 0,
      settings: { ...this.state.settings },
      retries: 0,
    };
    this.state.jobs.set(job.id, job);
    this.state.queue.push(imageId);
    return job;
  }

  updateJob(id: string, updates: Partial<ProcessingJob>): void {
    const job = this.state.jobs.get(id);
    if (job) {
      Object.assign(job, updates);
    }
  }

  getJobByImageId(imageId: string): ProcessingJob | undefined {
    for (const job of this.state.jobs.values()) {
      if (job.imageId === imageId) return job;
    }
    return undefined;
  }

  reset(): void {
    this.state.images.forEach(img => {
      if (img.thumbnail) URL.revokeObjectURL(img.thumbnail);
    });
    this.state = {
      currentView: 'remove-bg',
      images: new Map(),
      jobs: new Map(),
      queue: [],
      currentImageId: null,
      currentJobId: null,
      editHistory: [],
      editHistoryIndex: -1,
      settings: getDefaultSettings(),
      resizeSettings: getDefaultResizeSettings(),
      compressSettings: getDefaultCompressSettings(),
      upscaleSettings: getDefaultUpscaleSettings(),
      conversionSettings: getDefaultConversionSettings(),
      canvasState: getDefaultCanvasState(),
      isProcessing: false,
      performanceMode: 'balanced',
    };
  }

  getSettings(): ProcessingSettings {
    return { ...this.state.settings };
  }

  updateSettings(updates: Partial<ProcessingSettings>): void {
    Object.assign(this.state.settings, updates);
  }

  getResizeSettings(): ResizeSettings {
    return { ...this.state.resizeSettings };
  }

  updateResizeSettings(updates: Partial<ResizeSettings>): void {
    Object.assign(this.state.resizeSettings, updates);
  }

  getCompressSettings(): CompressSettings {
    return { ...this.state.compressSettings };
  }

  updateCompressSettings(updates: Partial<CompressSettings>): void {
    Object.assign(this.state.compressSettings, updates);
  }

  getUpscaleSettings(): UpscaleSettings {
    return { ...this.state.upscaleSettings };
  }

  updateUpscaleSettings(updates: Partial<UpscaleSettings>): void {
    Object.assign(this.state.upscaleSettings, updates);
  }

  getConversionSettings(): ConversionSettings {
    return { ...this.state.conversionSettings };
  }

  updateConversionSettings(updates: Partial<ConversionSettings>): void {
    Object.assign(this.state.conversionSettings, updates);
  }

  getCanvasState(): CanvasState {
    return { ...this.state.canvasState };
  }

  updateCanvasState(updates: Partial<CanvasState>): void {
    Object.assign(this.state.canvasState, updates);
  }

  pushEditHistory(op: any): void {
    this.state.editHistory = this.state.editHistory.slice(0, this.state.editHistoryIndex + 1);
    this.state.editHistory.push(op);
    this.state.editHistoryIndex = this.state.editHistory.length - 1;
  }

  undo(): any | null {
    if (this.state.editHistoryIndex < 0) return null;
    const op = this.state.editHistory[this.state.editHistoryIndex];
    this.state.editHistoryIndex--;
    return op;
  }

  redo(): any | null {
    if (this.state.editHistoryIndex >= this.state.editHistory.length - 1) return null;
    this.state.editHistoryIndex++;
    return this.state.editHistory[this.state.editHistoryIndex];
  }

  canUndo(): boolean {
    return this.state.editHistoryIndex >= 0;
  }

  canRedo(): boolean {
    return this.state.editHistoryIndex < this.state.editHistory.length - 1;
  }

  clearHistory(): void {
    this.state.editHistory = [];
    this.state.editHistoryIndex = -1;
  }
}

export const state = new State();
