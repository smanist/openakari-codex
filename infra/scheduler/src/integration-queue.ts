export interface IntegrationRequest {
  taskRunId: string;
  repoRoot: string;
}

interface QueuedIntegrationRequest {
  req: IntegrationRequest;
  run: (req: IntegrationRequest) => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export class IntegrationQueue {
  private queue: QueuedIntegrationRequest[] = [];
  private processing = false;

  enqueue<T>(
    req: IntegrationRequest,
    handler: (req: IntegrationRequest) => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        req,
        run: handler as (req: IntegrationRequest) => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      if (!this.processing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()!;
        try {
          next.resolve(await next.run(next.req));
        } catch (err) {
          next.reject(err);
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
