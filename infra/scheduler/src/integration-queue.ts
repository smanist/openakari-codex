export interface IntegrationRequest {
  taskRunId: string;
  repoRoot: string;
}

export class IntegrationQueue {
  private queue: IntegrationRequest[] = [];
  private processing = false;

  enqueue(req: IntegrationRequest): void {
    this.queue.push(req);
  }

  async processQueue(handler: (req: IntegrationRequest) => Promise<void>): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()!;
        await handler(next);
      }
    } finally {
      this.processing = false;
    }
  }
}
