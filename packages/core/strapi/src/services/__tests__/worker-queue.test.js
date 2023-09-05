"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_queue_1 = __importDefault(require("../worker-queue"));
describe('WorkerQueue', () => {
    test('Executes worker', async () => {
        const fn = jest.fn();
        const input = 1;
        const q = new worker_queue_1.default({
            logger: console.log.bind(console),
            concurrency: 1,
        });
        q.subscribe(fn);
        q.enqueue(input);
        await new Promise((resolve) => {
            setTimeout(resolve);
        });
        expect(fn).toHaveBeenCalledWith(input);
        expect(fn).toHaveBeenCalledTimes(1);
    });
    test('Executes worker', async () => {
        const fn = jest.fn();
        const input = 1;
        const q = new worker_queue_1.default({
            logger: console.log.bind(console),
            concurrency: 1,
        });
        q.subscribe(fn);
        q.enqueue(input);
        q.enqueue(input);
        q.enqueue(input);
        await new Promise((resolve) => {
            setTimeout(resolve);
        });
        expect(fn).toHaveBeenCalledWith(input);
        expect(fn).toHaveBeenCalledTimes(3);
    });
});
//# sourceMappingURL=worker-queue.test.js.map