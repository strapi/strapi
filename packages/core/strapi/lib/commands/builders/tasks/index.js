'use strict';

const { dtsTask } = require('./dts');
const { viteTask } = require('./vite');

/**
 * @template Task
 * @param {Task}
 * @returns {Task}
 *
 * @typedef {Object} TaskHandler
 * @property {(ctx: import("../packages").BuildContext, task: Task) => import('ora').Ora} print
 * @property {(ctx: import("../packages").BuildContext, task: Task) => Promise<void>} run
 * @property {(ctx: import("../packages").BuildContext, task: Task) => Promise<void>} success
 * @property {(ctx: import("../packages").BuildContext, task: Task, err: unknown) => Promise<void>} fail
 * @property {import('ora').Ora | null} _spinner
 */

/**
 * @type {{ "build:js": TaskHandler<import("./vite").ViteTask>; "build:dts": TaskHandler<import("./dts").DtsTask>; }}}
 */
const buildTaskHandlers = {
  'build:js': viteTask,
  'build:dts': dtsTask,
};

module.exports = {
  buildTaskHandlers,
};
