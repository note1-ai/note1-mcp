'use strict';

// preloaded with NODE_OPTIONS=--require: replaces child_process.spawn so the bin reports what it would run
const childProcess = require('node:child_process');
const { EventEmitter } = require('node:events');

childProcess.spawn = (command, args, options) => {
  process.stdout.write(`${JSON.stringify({
    args,
    authHeader: options.env.NOTE1_AUTH_HEADER ?? null,
  })}\n`);
  const child = new EventEmitter();
  child.kill = () => {};
  setImmediate(() => child.emit('exit', 0));
  return child;
};
