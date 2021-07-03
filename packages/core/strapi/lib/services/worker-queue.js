/**
 * Simple worker queue in memory
 */
'use strict';

const debug = require('debug')('strapi:worker-queue');

module.exports = class WorkerQueue {
  constructor({ logger, concurrency = 5 } = {}) {
    debug('Initialize worker queue');

    this.logger = logger;
    this.worker = noop;

    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  subscribe(worker) {
    debug('Subscribe to worker queue');
    this.worker = worker;
  }

  enqueue(payload) {
    debug('Enqueue event in worker queue');
    if (this.running < this.concurrency) {
      this.running++;
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
      this.running--;
    }
  }

  async execute(payload) {
    debug('Execute worker');
    try {
      await this.worker(payload);
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.pop();
    }
  }
};

function noop() {}
