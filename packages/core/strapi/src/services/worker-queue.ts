/**
 * Simple worker queue in memory
 */
import createDebugger from 'debug';
import type { Logger } from '@strapi/logger';
import type { Utils } from '@strapi/types';

const debug = createDebugger('strapi:worker-queue');

interface ConstructorParameters {
  logger: Logger;
  concurrency?: number;
}

type Worker<TPayload, TReturn> = (payload: TPayload) => Promise<TReturn> | TReturn;

const noop: Utils.Function.Any = () => {};

export default class WorkerQueue<TPayload, TReturn> {
  logger: Logger;

  worker: Worker<TPayload, TReturn>;

  concurrency: number;

  running: number;

  queue: TPayload[];

  constructor({ logger, concurrency = 5 }: ConstructorParameters) {
    debug('Initialize worker queue');

    this.logger = logger;
    this.worker = noop;

    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  subscribe(worker: Worker<TPayload, TReturn>) {
    debug('Subscribe to worker queue');
    this.worker = worker;
  }

  enqueue(payload: TPayload) {
    debug('Enqueue event in worker queue');
    if (this.running < this.concurrency) {
      this.running += 1;
      this.execute(payload);
    } else {
      this.queue.unshift(payload);
    }
  }

  pop() {
    debug('Pop worker queue and execute');
    const payload = this.queue.pop();

    if (payload) {
      this.execute(payload);
    } else {
      this.running -= 1;
    }
  }

  async execute(payload: TPayload) {
    debug('Execute worker');
    try {
      await this.worker(payload);
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.pop();
    }
  }
}
