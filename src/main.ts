/**
 * ClearBG AI Studio
 * Copyright (c) 2026 Mohit Sharma. All Rights Reserved.
 * Author & Lead Architect: Mohit Sharma (grnoida.mohitsharma2007@gmail.com)
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, or distribution of this code
 * or any portion thereof, via any medium, is strictly prohibited.
 */

import './styles/base.css';
import './styles/components.css';
import './styles/responsive.css';

import { defineMorphIcon } from 'morphicons/element';
import * as lucide from 'lucide';

defineMorphIcon();

import { events } from './core/event-bus';
import { state } from './core/state';
import { mountIcons } from './ui/icons';
import { createHeader, updateHeaderActiveTab } from './ui/header';
import { createSidebar, updateSidebarFileList } from './ui/sidebar-upload';
import {
  createEditor,
  showImageOnCanvas,
  showModelLoading,
  updateEditorTitle,
  updateBrushCursor,
  ViewMode
} from './ui/editor';
import { createToolPanel, updateUndoRedoButtons } from './ui/tool-panel';
import { createStatsBar, updateStats } from './ui/stats-bar';
import { createResizePage, cleanupResizePage } from './ui/resize-page';
import { createCompressPage, cleanupCompressPage } from './ui/compress-page';
import { createUpscalePage, cleanupUpscalePage } from './ui/upscale-page';
import { createConverter, cleanupConverter } from './ui/converter';
import { createHistoryPage } from './ui/history';
import { createNotifications } from './ui/notifications';
import { processImage, encodeImageAsync } from './processing/image-processor';
import { applyMaskToImage, applyBrushStroke } from './processing/background-remover';
import {
  ImageAdjustments,
  SubjectEffects,
  defaultAdjustments,
  defaultSubjectEffects,
  applyAdjustments,
  renderSubjectWithEffects
} from './processing/image-effects';
import { saveHistory } from './storage/api-store';
import type { View, ImageFile, ProcessingJob } from './core/types';

import { createAuthModal } from './ui/auth-modal';

interface HistorySnapshot {
  mask: Uint8ClampedArray;
  processed: ImageData;
}

class ClearBGApp {
  private app: HTMLElement;
  private header: HTMLElement;
  private mainContainer: HTMLElement;
  private statsBar: HTMLElement;
  private notifications: HTMLElement;
  private authModal: HTMLElement;

  // Views
  private removeBgView!: HTMLElement;
  private resizeView?: HTMLElement;
  private upscaleView?: HTMLElement;
  private convertView?: HTMLElement;
  private compressView?: HTMLElement;
  private historyView?: HTMLElement;

  // Background Removal State
  private rawBaseImageData?: ImageData;
  private currentMask?: Uint8ClampedArray;
  private baseAIMask?: Uint8ClampedArray;
  private processedImageData?: ImageData;
  private originalImageData?: ImageData;
  private currentTool: string = 'remove';
  private brushSize: number = 25;
  private isDrawing: boolean = false;
  private currentViewMode: ViewMode = 'split';

  // Photoshop Color Adjustments & Layer Styles
  private adjustments: ImageAdjustments = { ...defaultAdjustments };
  private subjectEffects: SubjectEffects = { ...defaultSubjectEffects };

  // Custom Background
  private currentBg: { type: 'transparent' | 'color' | 'gradient' | 'image'; value?: any } = { type: 'transparent' };

  // Undo / Redo History Stack
  private historyStack: HistorySnapshot[] = [];
  private historyPointer: number = -1;

  constructor() {
    this.app = document.getElementById('app')!;
    this.app.innerHTML = '';

    const initialView = state.get().currentView;
    this.header = createHeader(initialView);
    this.mainContainer = document.createElement('main');
    this.mainContainer.className = 'main-content';

    this.statsBar = createStatsBar();
    this.notifications = createNotifications();
    this.authModal = createAuthModal();

    this.buildRemoveBgView();

    this.app.appendChild(this.header);
    this.app.appendChild(this.mainContainer);
    this.app.appendChild(this.statsBar);
    this.app.appendChild(this.notifications);
    this.app.appendChild(this.authModal);

    this.setupEventListeners();
    this.setupCanvasInteractions();
    this.setupKeyboardShortcuts();
    this.navigate(initialView);
    mountIcons();
  }

  private buildRemoveBgView(): void {
    this.removeBgView = document.createElement('div');
    this.removeBgView.className = 'tool-layout view-enter';
    this.removeBgView.id = 'remove-bg-layout';

    const sidebar = createSidebar();
    const editor = createEditor();
    const toolPanel = createToolPanel();

    this.removeBgView.appendChild(sidebar);
    this.removeBgView.appendChild(editor);
    this.removeBgView.appendChild(toolPanel);
  }

  private async navigate(view: View): Promise<void> {
    state.set('currentView', view);
    updateHeaderActiveTab(this.header, view);
    this.mainContainer.innerHTML = '';

    if (view !== 'resize') cleanupResizePage();
    if (view !== 'compress') cleanupCompressPage();
    if (view !== 'upscale') cleanupUpscalePage();
    if (view !== 'convert') cleanupConverter();

    switch (view) {
      case 'remove-bg':
        this.mainContainer.appendChild(this.removeBgView);
        this.renderCurrentImage();
        break;
      case 'resize':
        this.resizeView = createResizePage();
        this.mainContainer.appendChild(this.resizeView);
        break;
      case 'upscale':
        this.upscaleView = createUpscalePage();
        this.mainContainer.appendChild(this.upscaleView);
        break;
      case 'convert':
        this.convertView = createConverter();
        this.mainContainer.appendChild(this.convertView);
        break;
      case 'compress':
        this.compressView = createCompressPage();
        this.mainContainer.appendChild(this.compressView);
        break;
      case 'history':
        this.historyView = await createHistoryPage();
        this.mainContainer.appendChild(this.historyView);
        break;
    }
    
    mountIcons();
  }

  private setupEventListeners(): void {
    events.on('navigate', (view: View) => this.navigate(view));

    events.on('filesSelected', (files: File[]) => {
      this.handleUploadedFiles(files);
    });

    events.on('selectImage', (id: string) => {
      state.set('currentImageId', id);
      updateSidebarFileList();
      this.renderCurrentImage();
    });

    events.on('removeImage', (id: string) => {
      state.removeImage(id);
      const appState = state.get();
      if (appState.currentImageId === id) {
        const firstRemaining = Array.from(appState.images.keys())[0] || null;
        state.set('currentImageId', firstRemaining);
      }
      updateSidebarFileList();
      this.renderCurrentImage();
      updateStats();
    });

    events.on('clearAll', () => {
      state.reset();
      this.rawBaseImageData = undefined;
      this.currentMask = undefined;
      this.baseAIMask = undefined;
      this.processedImageData = undefined;
      this.originalImageData = undefined;
      this.adjustments = { ...defaultAdjustments };
      this.subjectEffects = { ...defaultSubjectEffects };
      this.historyStack = [];
      this.historyPointer = -1;
      updateSidebarFileList();
      showImageOnCanvas(null);
      updateUndoRedoButtons(false, false);
      updateStats();
    });

    events.on('viewModeChange', (mode: ViewMode) => {
      this.currentViewMode = mode;
      this.refreshCanvasDisplay();
    });

    events.on('splitChange', () => {
      this.refreshCanvasDisplay();
    });

    events.on('toolChange', (tool: string) => {
      this.currentTool = tool;
    });

    events.on('brushSizeChange', (size: number) => {
      this.brushSize = size;
    });

    events.on('exportImage', () => this.exportResult());
    events.on('downloadImage', () => this.exportResult());

    // Photo Editor Integration (Filerobot)
    events.on('editor:launch', async () => {
      // Allow editing either the processed (bg-removed) image or the original
      const sourceData = this.processedImageData || this.rawBaseImageData;
      if (!sourceData) {
        events.emit('notify', {
          type: 'warning',
          title: 'No Image',
          message: 'Please upload an image first before opening the editor.',
        });
        return;
      }

      // Convert ImageData to a data URL for Filerobot
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = sourceData.width;
      srcCanvas.height = sourceData.height;
      srcCanvas.getContext('2d')!.putImageData(sourceData, 0, 0);
      const imgDataUrl = srcCanvas.toDataURL('image/png');

      // Create fullscreen container overlay
      const container = document.createElement('div');
      container.id = 'filerobot-container';
      Object.assign(container.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '10000',
        backgroundColor: '#0f172a',
      });
      document.body.appendChild(container);

      try {
        // Filerobot exports its constructor as default from the NPM package
        const filerobotModule = await import('filerobot-image-editor');
        const FilerobotImageEditor = filerobotModule.default || filerobotModule;

        // Extract TABS and TOOLS constants
        const { TABS, TOOLS } = (FilerobotImageEditor as any);

        const config: any = {
          source: imgDataUrl,
          // Enable all available tabs
          tabsIds: TABS ? [
            TABS.ADJUST,
            TABS.FINETUNE,
            TABS.FILTERS,
            TABS.RESIZE,
            TABS.ANNOTATE,
            TABS.WATERMARK,
          ].filter(Boolean) : [],
          // Default selected tool
          defaultTabId: TABS?.ADJUST || 'Adjust',
          defaultToolId: TOOLS?.BRIGHTNESS || 'Brightness',
          // Image quality settings
          savingPixelRatio: 4,
          previewPixelRatio: 2,
          // Annotations common config
          annotationsCommon: {
            fill: '#2563eb',
            stroke: '#2563eb',
            strokeWidth: 2,
            opacity: 1,
          },
          // Text annotation defaults
          Text: {
            text: 'Text',
            fill: '#ffffff',
            fontSize: 24,
            fontFamily: 'Inter, sans-serif',
          },
          // Save callback — receives the edited image
          onSave: (editedImageObject: any, designState: any) => {
            // editedImageObject.imageBase64 contains the full data URL
            const dataUrl = editedImageObject.imageBase64;
            if (!dataUrl) {
              console.warn('[Filerobot] No imageBase64 in save result');
              return;
            }

            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width;
              c.height = img.height;
              const ctx = c.getContext('2d')!;
              ctx.drawImage(img, 0, 0);
              const editedData = ctx.getImageData(0, 0, c.width, c.height);

              // Update whichever image we were editing
              if (this.processedImageData) {
                this.processedImageData = editedData;
                this.rawBaseImageData = editedData;
                // Re-sync mask from alpha channel so manual brush and edge filters don't revert edits
                this.currentMask = new Uint8ClampedArray(editedData.width * editedData.height);
                for (let i = 0; i < this.currentMask.length; i++) {
                  this.currentMask[i] = editedData.data[i * 4 + 3];
                }
              } else {
                this.rawBaseImageData = editedData;
                this.originalImageData = editedData;
              }
              this.refreshCanvasDisplay();

              events.emit('notify', {
                type: 'success',
                title: 'Photo Edited',
                message: 'Your edits have been applied successfully.',
              });

              editor.terminate();
              container.remove();
            };
            img.onerror = () => {
              console.error('[Filerobot] Failed to load edited image');
              editor.terminate();
              container.remove();
            };
            img.src = dataUrl;
          },
          onClose: (closingReason: string) => {
            editor.terminate();
            container.remove();
          },
          // Dark theme matching the app
          theme: {
            palette: {
              'bg-primary': '#0f172a',
              'bg-primary-hover': '#1e293b',
              'bg-secondary': '#1e293b',
              'bg-secondary-hover': '#334155',
              'accent-primary': '#2563eb',
              'accent-primary-hover': '#1d4ed8',
              'icons-primary': '#e2e8f0',
              'icons-secondary': '#94a3b8',
              'borders-primary': '#334155',
              'borders-secondary': '#1e293b',
              'borders-strong': '#475569',
              'light-shadow': 'rgba(0, 0, 0, 0.3)',
              'warning': '#f59e0b',
              'error': '#ef4444',
            },
            typography: {
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          },
        };

        const editor = new FilerobotImageEditor(container, config);
        editor.render();

      } catch (err: any) {
        console.error('[Photo Editor] Failed to initialize Filerobot:', err);
        container.remove();
        events.emit('notify', {
          type: 'error',
          title: 'Editor Error',
          message: 'Failed to open the photo editor. Please try again.',
        });
      }
    });

    // Photoshop Adjustments
    events.on('adjust:change', (updates: Partial<ImageAdjustments>) => {
      Object.assign(this.adjustments, updates);
      this.refreshCanvasDisplay();
    });

    events.on('adjust:reset', () => {
      this.adjustments = { ...defaultAdjustments };
      this.refreshCanvasDisplay();
    });

    // Layer Styles & Subject Effects
    events.on('effects:change', (updates: Partial<SubjectEffects>) => {
      Object.assign(this.subjectEffects, updates);
      this.refreshCanvasDisplay();
    });

    // Background replacement
    events.on('backgroundChange', (bgData: any) => {
      if (bgData.type === 'color') {
        this.currentBg = { type: bgData.value === 'transparent' ? 'transparent' : 'color', value: bgData.value };
      } else if (bgData.type === 'gradient') {
        this.currentBg = { type: 'gradient', value: bgData.value };
      } else if (bgData.type === 'image') {
        this.currentBg = { type: 'image', value: bgData.value };
      }
      this.refreshCanvasDisplay();
    });

    // Transformations
    events.on('action:rotate', (deg: number) => this.rotateImage(deg));
    events.on('action:flip', (dir: 'horizontal' | 'vertical') => this.flipImage(dir));

    // History operations
    events.on('action:undo', () => this.undo());
    events.on('action:redo', () => this.redo());
    events.on('action:resetMask', () => this.resetToAIMask());

    // Edge refinements
    events.on('refine:smooth', (val: number) => this.applyEdgeRefinement('smooth', val));
    events.on('refine:feather', (val: number) => this.applyEdgeRefinement('feather', val));
    events.on('refine:contrast', (val: number) => this.applyEdgeRefinement('contrast', val));
    events.on('refine:shiftEdge', (val: number) => this.applyEdgeRefinement('shift', val));
    events.on('refine:despill', (active: boolean) => this.applyEdgeRefinement('despill', active ? 1 : 0));
    events.on('refine:invert', () => this.invertCurrentMask());
  }

  private async handleUploadedFiles(files: File[]): Promise<void> {
    for (const file of files) {
      try {
        const img = await this.loadImageElement(file);
        const imageFile = state.addImage(file, img);
        const job = state.createJob(imageFile.id);

        if (!state.get().currentImageId) {
          state.set('currentImageId', imageFile.id);
        }

        updateSidebarFileList();
        updateStats();

        this.processJob(job, imageFile, img);
      } catch (err: any) {
        events.emit('notify', {
          type: 'error',
          title: 'Upload Error',
          message: err.message || 'Failed to parse image',
        });
      }
    }
  }

  private async processJob(job: ProcessingJob, imageFile: ImageFile, img: HTMLImageElement): Promise<void> {
    state.updateJob(job.id, { status: 'processing', startTime: Date.now() });
    updateSidebarFileList();
    updateStats();

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const rawImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (state.get().currentImageId === imageFile.id) {
      this.originalImageData = rawImageData;
      this.rawBaseImageData = rawImageData;
      showModelLoading(true, 'Initializing AI Segmentation Model...', 0.1);
    }

    try {
      const result = await processImage(rawImageData, state.getSettings(), (progress, status) => {
        state.updateJob(job.id, { progress });
        if (state.get().currentImageId === imageFile.id) {
          showModelLoading(true, status || 'Extracting foreground...', progress);
        }
        updateSidebarFileList();
      });

      const processedData = new ImageData(
        new Uint8ClampedArray(result.processedData.buffer as ArrayBuffer),
        result.width,
        result.height
      );
      const maskData = new ImageData(result.width, result.height);

      state.updateJob(job.id, {
        status: 'complete',
        progress: 1,
        endTime: Date.now(),
        result: { imageData: processedData, maskData },
      });

      if (state.get().currentImageId === imageFile.id) {
        this.rawBaseImageData = rawImageData;
        this.originalImageData = rawImageData;
        this.currentMask = new Uint8ClampedArray(result.maskData);
        this.baseAIMask = new Uint8ClampedArray(result.maskData);
        this.processedImageData = processedData;

        // Reset undo history stack
        this.historyStack = [{ mask: new Uint8ClampedArray(this.currentMask), processed: this.cloneImageData(processedData) }];
        this.historyPointer = 0;
        updateUndoRedoButtons(false, false);

        showModelLoading(false);
        this.refreshCanvasDisplay();

        // Save into PostgreSQL & Local Cache
        const resBlob = await this.imageDataToBlob(processedData);
        const resUrl = URL.createObjectURL(resBlob);
        saveHistory({
          name: imageFile.name,
          tool: 'Background Remover',
          originalSize: imageFile.size,
          resultSize: resBlob.size,
          width: imageFile.width,
          height: imageFile.height,
          thumbnail: resUrl,
          resultBlob: resBlob,
        });
      }

      events.emit('notify', {
        type: 'success',
        title: 'Cutout Complete',
        message: `Precision cutout created for ${imageFile.name}`,
      });
    } catch (err: any) {
      state.updateJob(job.id, { status: 'error', error: err.message, endTime: Date.now() });
      events.emit('notify', {
        type: 'error',
        title: 'Removal Error',
        message: err.message || 'Background removal encountered an error',
      });
    } finally {
      showModelLoading(false);
      updateSidebarFileList();
      updateStats();
    }
  }

  private async renderCurrentImage(): Promise<void> {
    const currentId = state.get().currentImageId;
    if (!currentId) {
      showImageOnCanvas(null);
      updateEditorTitle('Remove Background', 'Upload an image from the sidebar to get started');
      return;
    }

    const imageFile = state.get().images.get(currentId);
    const job = state.getJobByImageId(currentId);

    if (!imageFile) return;

    updateEditorTitle(imageFile.name, `${imageFile.width} × ${imageFile.height} px · ${(imageFile.size / 1024).toFixed(1)} KB`);

    if (job?.result?.imageData) {
      this.processedImageData = job.result.imageData;
      this.refreshCanvasDisplay();
    } else {
      const img = await this.loadImageElement(imageFile.file);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      this.originalImageData = data;
      this.rawBaseImageData = data;
      showImageOnCanvas(null, data, 'original');
    }
  }

  private refreshCanvasDisplay(): void {
    if (!this.processedImageData || !this.rawBaseImageData) return;

    // Step 1: Apply Photoshop Adjustments (Color Grading)
    let adjustedCutout = applyAdjustments(this.processedImageData, this.adjustments);

    // Step 2: Apply Layer Styles (Sticker Outline, Drop Shadow, Background Blur, Vignette)
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = adjustedCutout.width;
    compositeCanvas.height = adjustedCutout.height;

    renderSubjectWithEffects(
      compositeCanvas,
      adjustedCutout,
      this.subjectEffects,
      {
        type: this.currentBg.type,
        value: this.currentBg.value,
        originalImg: this.originalImageData,
      }
    );

    const finalImageData = compositeCanvas.getContext('2d')!.getImageData(0, 0, compositeCanvas.width, compositeCanvas.height);
    showImageOnCanvas(finalImageData, this.originalImageData, this.currentViewMode);
  }

  private setupCanvasInteractions(): void {
    const container = document.getElementById('canvas-container');
    const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!container || !mainCanvas) return;

    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateBrushCursor(x, y, this.brushSize, true);

      if (this.isDrawing && this.currentMask && this.rawBaseImageData) {
        const pt = this.getCanvasPoint(e, mainCanvas);
        this.paintBrushAt(pt.x, pt.y);
      }
    });

    container.addEventListener('mouseleave', () => {
      updateBrushCursor(0, 0, this.brushSize, false);
      if (this.isDrawing) {
        this.isDrawing = false;
        this.pushHistorySnapshot();
      }
    });

    container.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('#split-divider')) return;
      if (!this.currentMask || !this.rawBaseImageData) return;
      this.isDrawing = true;
      const pt = this.getCanvasPoint(e, mainCanvas);

      if (this.currentTool === 'wand') {
        this.magicWandErase(pt.x, pt.y);
        this.pushHistorySnapshot();
        this.isDrawing = false;
      } else {
        this.paintBrushAt(pt.x, pt.y);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.pushHistorySnapshot();
      }
    });
  }

  private getCanvasPoint(e: MouseEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }

  private paintBrushAt(x: number, y: number): void {
    if (!this.currentMask || !this.rawBaseImageData) return;
    const val = this.currentTool === 'remove' || this.currentTool === 'eraser' ? 0 : 255;
    applyBrushStroke(
      this.currentMask,
      this.rawBaseImageData.width,
      this.rawBaseImageData.height,
      [{ x, y }],
      this.brushSize,
      val
    );
    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.refreshCanvasDisplay();
  }

  private magicWandErase(startX: number, startY: number): void {
    if (!this.rawBaseImageData || !this.currentMask) return;
    const w = this.rawBaseImageData.width;
    const h = this.rawBaseImageData.height;
    const data = this.rawBaseImageData.data;

    const startIdx = (startY * w + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const tolerance = 35;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const dist = Math.sqrt(
          (r - targetR) * (r - targetR) +
          (g - targetG) * (g - targetG) +
          (b - targetB) * (b - targetB)
        );
        if (dist <= tolerance) {
          this.currentMask[y * w + x] = 0;
        }
      }
    }

    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.refreshCanvasDisplay();
  }

  private applyEdgeRefinement(type: 'smooth' | 'feather' | 'contrast' | 'shift' | 'despill', val: number): void {
    if (!this.baseAIMask || !this.rawBaseImageData) return;
    const mask = new Uint8ClampedArray(this.baseAIMask);

    if (type === 'smooth' || type === 'feather') {
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 10 && mask[i] < 245) {
          mask[i] = Math.min(255, Math.max(0, mask[i] + (val - 25)));
        }
      }
    } else if (type === 'contrast') {
      const factor = (val + 100) / 100;
      for (let i = 0; i < mask.length; i++) {
        mask[i] = mask[i] >= 128 ? Math.min(255, Math.round(128 + (mask[i] - 128) * factor)) : Math.max(0, Math.round(128 - (128 - mask[i]) * factor));
      }
    }

    this.currentMask = mask;
    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.refreshCanvasDisplay();
  }

  private invertCurrentMask(): void {
    if (!this.currentMask || !this.rawBaseImageData) return;
    for (let i = 0; i < this.currentMask.length; i++) {
      this.currentMask[i] = 255 - this.currentMask[i];
    }
    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.pushHistorySnapshot();
    this.refreshCanvasDisplay();
  }

  private resetToAIMask(): void {
    if (!this.baseAIMask || !this.rawBaseImageData) return;
    this.currentMask = new Uint8ClampedArray(this.baseAIMask);
    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.pushHistorySnapshot();
    this.refreshCanvasDisplay();
  }

  private rotateImage(deg: number): void {
    if (!this.processedImageData || !this.rawBaseImageData || !this.currentMask) return;
    const canvas = document.createElement('canvas');
    const is90 = Math.abs(deg) === 90;
    canvas.width = is90 ? this.processedImageData.height : this.processedImageData.width;
    canvas.height = is90 ? this.processedImageData.width : this.processedImageData.height;
    const ctx = canvas.getContext('2d')!;

    const origCanvas = document.createElement('canvas');
    origCanvas.width = this.rawBaseImageData.width;
    origCanvas.height = this.rawBaseImageData.height;
    origCanvas.getContext('2d')!.putImageData(this.rawBaseImageData, 0, 0);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(origCanvas, -origCanvas.width / 2, -origCanvas.height / 2);
    ctx.restore();

    this.rawBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.originalImageData = this.rawBaseImageData;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = origCanvas.width;
    maskCanvas.height = origCanvas.height;
    const mctx = maskCanvas.getContext('2d')!;
    const mData = mctx.createImageData(maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < this.currentMask.length; i++) {
      mData.data[i * 4] = this.currentMask[i];
      mData.data[i * 4 + 1] = this.currentMask[i];
      mData.data[i * 4 + 2] = this.currentMask[i];
      mData.data[i * 4 + 3] = 255;
    }
    mctx.putImageData(mData, 0, 0);

    const rotMaskCanvas = document.createElement('canvas');
    rotMaskCanvas.width = canvas.width;
    rotMaskCanvas.height = canvas.height;
    const rmctx = rotMaskCanvas.getContext('2d')!;
    rmctx.save();
    rmctx.translate(rotMaskCanvas.width / 2, rotMaskCanvas.height / 2);
    rmctx.rotate((deg * Math.PI) / 180);
    rmctx.drawImage(maskCanvas, -maskCanvas.width / 2, -maskCanvas.height / 2);
    rmctx.restore();

    const rotMData = rmctx.getImageData(0, 0, rotMaskCanvas.width, rotMaskCanvas.height);
    this.currentMask = new Uint8ClampedArray(rotMData.width * rotMData.height);
    for (let i = 0; i < this.currentMask.length; i++) {
      this.currentMask[i] = rotMData.data[i * 4];
    }

    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.pushHistorySnapshot();
    this.refreshCanvasDisplay();
  }

  private flipImage(direction: 'horizontal' | 'vertical'): void {
    if (!this.processedImageData || !this.rawBaseImageData || !this.currentMask) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.rawBaseImageData.width;
    canvas.height = this.rawBaseImageData.height;
    const ctx = canvas.getContext('2d')!;

    const origCanvas = document.createElement('canvas');
    origCanvas.width = canvas.width;
    origCanvas.height = canvas.height;
    origCanvas.getContext('2d')!.putImageData(this.rawBaseImageData, 0, 0);

    ctx.save();
    if (direction === 'horizontal') {
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height); ctx.scale(1, -1);
    }
    ctx.drawImage(origCanvas, 0, 0);
    ctx.restore();

    this.rawBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.originalImageData = this.rawBaseImageData;

    const w = canvas.width;
    const h = canvas.height;
    const flippedMask = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcX = direction === 'horizontal' ? w - 1 - x : x;
        const srcY = direction === 'vertical' ? h - 1 - y : y;
        flippedMask[y * w + x] = this.currentMask[srcY * w + srcX];
      }
    }
    this.currentMask = flippedMask;
    this.processedImageData = applyMaskToImage(this.rawBaseImageData, this.currentMask);
    this.pushHistorySnapshot();
    this.refreshCanvasDisplay();
  }

  private pushHistorySnapshot(): void {
    if (!this.currentMask || !this.processedImageData) return;
    this.historyStack = this.historyStack.slice(0, this.historyPointer + 1);
    this.historyStack.push({
      mask: new Uint8ClampedArray(this.currentMask),
      processed: this.cloneImageData(this.processedImageData),
    });
    this.historyPointer = this.historyStack.length - 1;
    updateUndoRedoButtons(this.historyPointer > 0, false);
  }

  private undo(): void {
    if (this.historyPointer <= 0) return;
    this.historyPointer--;
    const snap = this.historyStack[this.historyPointer];
    this.currentMask = new Uint8ClampedArray(snap.mask);
    this.processedImageData = this.cloneImageData(snap.processed);
    updateUndoRedoButtons(this.historyPointer > 0, true);
    this.refreshCanvasDisplay();
  }

  private redo(): void {
    if (this.historyPointer >= this.historyStack.length - 1) return;
    this.historyPointer++;
    const snap = this.historyStack[this.historyPointer];
    this.currentMask = new Uint8ClampedArray(snap.mask);
    this.processedImageData = this.cloneImageData(snap.processed);
    updateUndoRedoButtons(true, this.historyPointer < this.historyStack.length - 1);
    this.refreshCanvasDisplay();
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private async exportResult(): Promise<void> {
    if (!this.processedImageData) return;
    const conf = state.getConversionSettings();

    try {
      // Create final composite image with all adjustments & layer effects
      const adjusted = applyAdjustments(this.processedImageData, this.adjustments);
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = adjusted.width;
      compositeCanvas.height = adjusted.height;

      renderSubjectWithEffects(
        compositeCanvas,
        adjusted,
        this.subjectEffects,
        {
          type: this.currentBg.type,
          value: this.currentBg.value,
          originalImg: this.originalImageData,
        }
      );

      const exportData = compositeCanvas.getContext('2d')!.getImageData(0, 0, compositeCanvas.width, compositeCanvas.height);

      const { buffer, format } = await encodeImageAsync(exportData, conf.format, conf.quality / 100);
      const blob = new Blob([buffer.buffer as ArrayBuffer], { type: `image/${format}` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const currentId = state.get().currentImageId;
      const origName = currentId ? state.get().images.get(currentId)?.name || 'image' : 'image';
      const baseName = origName.substring(0, origName.lastIndexOf('.')) || origName;
      a.href = url;
      a.download = `${baseName}_edited.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      events.emit('notify', {
        type: 'success',
        title: 'Export Succeeded',
        message: `Saved high-quality ${format.toUpperCase()}`,
      });
    } catch (err: any) {
      events.emit('notify', {
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not export image',
      });
    }
  }

  private cloneImageData(img: ImageData): ImageData {
    return new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
  }

  private imageDataToBlob(imageData: ImageData): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/png');
    });
  }

  private loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
      img.src = url;
    });
  }
}

new ClearBGApp();
