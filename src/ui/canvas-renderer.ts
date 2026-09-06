import { events } from '../core/event-bus';
import { state } from '../core/state';
import type { Point } from '../core/types';

export class CanvasRenderer {
  private container: HTMLElement;
  private canvasWrapper: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalCanvas: HTMLCanvasElement;
  private originalCtx: CanvasRenderingContext2D;
  private comparisonSlider: HTMLElement | null = null;

  private originalImageData: ImageData | null = null;
  private processedImageData: ImageData | null = null;
  private maskData: Uint8ClampedArray | null = null;

  private zoom = 1;
  private panX = 0;
  private panY = 0;
  private isPanning = false;
  private lastPanPoint = { x: 0, y: 0 };

  private isDrawing = false;
  private currentTool: string = 'remove';
  private brushSize = 20;
  private drawPoints: Point[] = [];

  private comparisonPosition = 50;
  private showCheckerboard = true;
  private showComparison = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvasWrapper = document.createElement('div');
    this.canvasWrapper.className = 'canvas-wrapper checkerboard';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.originalCanvas = document.createElement('canvas');
    this.originalCtx = this.originalCanvas.getContext('2d')!;

    this.canvasWrapper.appendChild(this.originalCanvas);
    this.canvasWrapper.appendChild(this.canvas);
    this.container.appendChild(this.canvasWrapper);

    this.setupEvents();
  }

  private setupEvents(): void {
    this.canvasWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.setZoom(this.zoom + delta);
    });

    this.canvasWrapper.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        this.isPanning = true;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.canvasWrapper.style.cursor = 'grabbing';
        e.preventDefault();
      } else if (e.button === 0) {
        this.startDrawing(e);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        this.panX += e.clientX - this.lastPanPoint.x;
        this.panY += e.clientY - this.lastPanPoint.y;
        this.lastPanPoint = { x: e.clientX, y: e.clientY };
        this.render();
      } else if (this.isDrawing) {
        this.continueDrawing(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.canvasWrapper.style.cursor = '';
      }
      if (this.isDrawing) {
        this.endDrawing();
      }
    });

    events.on('tool:changed', (tool: string) => {
      this.currentTool = tool;
    });

    events.on('brush:size', (size: number) => {
      this.brushSize = size;
    });

    events.on('action:zoomIn', () => this.setZoom(this.zoom + 0.25));
    events.on('action:zoomOut', () => this.setZoom(this.zoom - 0.25));
    events.on('action:zoomFit', () => this.fitToView());
    events.on('action:checkerboard', () => {
      this.showCheckerboard = !this.showCheckerboard;
      this.canvasWrapper.classList.toggle('checkerboard', this.showCheckerboard);
    });
    events.on('action:reset', () => this.resetView());
  }

  loadImage(imageData: ImageData, mask?: Uint8ClampedArray): void {
    this.originalImageData = imageData;
    this.processedImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    this.maskData = mask ? new Uint8ClampedArray(mask) : new Uint8ClampedArray(imageData.width * imageData.height).fill(255);

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.originalCanvas.width = imageData.width;
    this.originalCanvas.height = imageData.height;

    this.originalCtx.putImageData(imageData, 0, 0);
    this.fitToView();
    this.render();
  }

  updateProcessed(processed: ImageData, mask: Uint8ClampedArray): void {
    this.processedImageData = processed;
    this.maskData = mask;
    this.render();
  }

  private render(): void {
    if (!this.processedImageData || !this.originalImageData) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.clearRect(0, 0, w, h);

    if (this.showComparison) {
      const splitX = Math.round(w * this.comparisonPosition / 100);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, 0, splitX, h);
      this.ctx.clip();
      this.ctx.putImageData(this.originalImageData, 0, 0);
      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(splitX, 0, w - splitX, h);
      this.ctx.clip();
      this.ctx.putImageData(this.processedImageData, 0, 0);
      this.ctx.restore();

      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(splitX, 0);
      this.ctx.lineTo(splitX, h);
      this.ctx.stroke();

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(splitX, 0);
      this.ctx.lineTo(splitX, h);
      this.ctx.stroke();
    } else {
      this.ctx.putImageData(this.processedImageData, 0, 0);
    }

    this.applyTransform();
  }

  private applyTransform(): void {
    const wrapper = this.canvasWrapper;
    this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.canvas.style.transformOrigin = '0 0';
    this.originalCanvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    this.originalCanvas.style.transformOrigin = '0 0';
    this.originalCanvas.style.display = this.showComparison ? 'block' : 'none';
  }

  setZoom(z: number): void {
    this.zoom = Math.max(0.1, Math.min(5, z));
    this.applyTransform();
  }

  fitToView(): void {
    if (!this.originalImageData) return;
    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
    const padding = 40;
    const scaleX = (wrapperRect.width - padding) / this.originalImageData.width;
    const scaleY = (wrapperRect.height - padding) / this.originalImageData.height;
    this.zoom = Math.min(scaleX, scaleY, 1);
    this.panX = (wrapperRect.width - this.originalImageData.width * this.zoom) / 2;
    this.panY = (wrapperRect.height - this.originalImageData.height * this.zoom) / 2;
    this.applyTransform();
  }

  resetView(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  setComparison(position: number): void {
    this.comparisonPosition = position;
    this.render();
  }

  toggleComparison(show: boolean): void {
    this.showComparison = show;
    this.render();
  }

  private getCanvasPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / this.zoom,
      y: (e.clientY - rect.top) / this.zoom,
    };
  }

  private startDrawing(e: MouseEvent): void {
    if (this.currentTool === 'pan') return;
    this.isDrawing = true;
    this.drawPoints = [this.getCanvasPoint(e)];
  }

  private continueDrawing(e: MouseEvent): void {
    if (!this.isDrawing) return;
    this.drawPoints.push(this.getCanvasPoint(e));
    this.renderBrushPreview();
  }

  private endDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.drawPoints.length > 0 && this.maskData && this.processedImageData && this.originalImageData) {
      const value = this.currentTool === 'remove' ? 0 : this.currentTool === 'keep' ? 255 : -1;
      events.emit('brush:stroke', {
        points: this.drawPoints,
        brushSize: this.brushSize,
        value,
        mask: this.maskData,
        width: this.canvas.width,
        height: this.canvas.height,
      });
    }
    this.drawPoints = [];
    this.render();
  }

  private renderBrushPreview(): void {
    if (!this.processedImageData) return;
    this.render();

    if (this.drawPoints.length > 0) {
      const lastPoint = this.drawPoints[this.drawPoints.length - 1];
      this.ctx.beginPath();
      this.ctx.arc(lastPoint.x, lastPoint.y, this.brushSize / 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.currentTool === 'remove' ? '#DC2626' : this.currentTool === 'keep' ? '#16A34A' : '#64748B';
      this.ctx.lineWidth = 2 / this.zoom;
      this.ctx.stroke();
    }
  }

  exportProcessed(): ImageData | null {
    return this.processedImageData;
  }

  getMask(): Uint8ClampedArray | null {
    return this.maskData;
  }

  destroy(): void {
    events.removeAll();
  }
}
