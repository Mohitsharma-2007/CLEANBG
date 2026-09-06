import { events } from '../core/event-bus';
import { state } from '../core/state';
import { processImage, encodeImageAsync } from '../processing/image-processor';
import type { ProcessingJob } from '../core/types';
import { fileToImageData, loadImage, validateFile, validateImage } from '../core/file-validator';

class QueueManager {
  private processing = false;
  private maxConcurrent = 2;
  private activeJobs = 0;

  async addImage(file: File): Promise<string> {
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const img = await loadImage(file);
    const imgValidation = validateImage(img);
    if (!imgValidation.valid) {
      throw new Error(imgValidation.error);
    }

    const imageFile = state.addImage(file, img);
    const job = state.createJob(imageFile.id);

    events.emit('image:added', imageFile);
    events.emit('job:created', job);
    events.emit('queue:updated');

    this.processNext();

    return imageFile.id;
  }

  async addImages(files: File[]): Promise<string[]> {
    const ids: string[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      try {
        const id = await this.addImage(file);
        ids.push(id);
      } catch (e: any) {
        errors.push({ file: file.name, error: e.message });
        events.emit('notification:show', {
          type: 'error',
          message: `${file.name}: ${e.message}`,
        });
      }
    }

    if (errors.length > 0) {
      events.emit('upload:errors', errors);
    }

    return ids;
  }

  private async processNext(): Promise<void> {
    if (this.activeJobs >= this.maxConcurrent) return;

    const queue = state.get().queue;

    for (const imageId of queue) {
      if (this.activeJobs >= this.maxConcurrent) break;

      const job = state.getJobByImageId(imageId);
      if (!job || job.status !== 'queued') continue;

      this.activeJobs++;
      state.updateJob(job.id, { status: 'processing', startTime: Date.now(), progress: 0 });
      events.emit('job:started', job);

      this.processJob(job).catch(() => {}).finally(() => {
        this.activeJobs--;
        this.processNext();
      });
    }
  }

  private async processJob(job: ProcessingJob): Promise<void> {
    const imageFile = state.get().images.get(job.imageId);
    if (!imageFile) {
      state.updateJob(job.id, { status: 'error', error: 'Image not found' });
      return;
    }

    try {
      const img = await loadImage(imageFile.file);
      const imageData = fileToImageData(imageFile.file, img);

      const result = await processImage(
        imageData,
        job.settings,
        (progress) => {
          state.updateJob(job.id, { progress });
          events.emit('job:progress', { jobId: job.id, progress });
        }
      );

      const processedImageData = new ImageData(
        new Uint8ClampedArray(result.processedData),
        result.width,
        result.height
      );

      state.updateJob(job.id, {
        status: 'complete',
        progress: 1,
        endTime: Date.now(),
        result: {
          imageData: processedImageData,
          maskData: new ImageData(
            new Uint8ClampedArray(result.maskData),
            result.width,
            result.height
          ),
        },
      });

      events.emit('job:complete', job);
    } catch (err: any) {
      state.updateJob(job.id, {
        status: 'error',
        error: err.message,
        endTime: Date.now(),
      });
      events.emit('job:error', { job, error: err.message });
    }
  }

  async reprocessImage(imageId: string): Promise<void> {
    const job = state.getJobByImageId(imageId);
    if (!job) return;

    state.updateJob(job.id, {
      status: 'queued',
      progress: 0,
      retries: job.retries + 1,
    });

    events.emit('job:requeued', job);
    this.processNext();
  }

  cancelJob(jobId: string): void {
    const job = state.get().jobs.get(jobId);
    if (job) {
      state.updateJob(jobId, { status: 'cancelled' });
      events.emit('job:cancelled', job);
    }
  }

  removeJob(jobId: string): void {
    const job = state.get().jobs.get(jobId);
    if (job) {
      this.cancelJob(jobId);
      state.removeImage(job.imageId);
      events.emit('job:removed', job);
      events.emit('queue:updated');
    }
  }

  async exportImage(
    imageId: string,
    format: string,
    quality: number,
    width?: number,
    height?: number
  ): Promise<Blob> {
    const job = state.getJobByImageId(imageId);
    if (!job?.result) throw new Error('Image not processed');

    const blob = await encodeImageAsync(
      job.result.imageData,
      format,
      quality / 100
    );

    return new Blob([blob.buffer as BlobPart], { type: `image/${format}` });
  }

  getMetrics() {
    const jobs = Array.from(state.get().jobs.values());
    const completed = jobs.filter(j => j.status === 'complete' && j.startTime && j.endTime);

    if (completed.length === 0) {
      return { avgProcessingTime: 0, throughput: 0, totalProcessed: 0 };
    }

    const totalTime = completed.reduce((sum, j) => sum + (j.endTime! - j.startTime!), 0);
    return {
      avgProcessingTime: totalTime / completed.length,
      throughput: completed.length / (totalTime / 1000),
      totalProcessed: completed.length,
    };
  }

  processAll(): void {
    this.processNext();
  }
}

export const queueManager = new QueueManager();
