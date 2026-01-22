/**
 * Utils file containing file treatment utils
 */
import { Writable, WritableOptions } from 'node:stream';

const kbytesToBytes = (kbytes: number) => kbytes * 1000;
const bytesToKbytes = (bytes: number) => Math.round((bytes / 1000) * 100) / 100;
const bytesToHumanReadable = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(`${Math.floor(Math.log(bytes) / Math.log(1000))}`, 10);
  return `${Math.round(bytes / 1000 ** i)} ${sizes[i]}`;
};

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    // Cleanup function to remove all listeners and prevent memory leaks
    const cleanup = () => {
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onError);
    };

    // Named functions required for removeListener to work
    const onData = (chunk: Uint8Array) => {
      chunks.push(chunk);
    };

    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
  });

const getStreamSize = (stream: NodeJS.ReadableStream) =>
  new Promise((resolve, reject) => {
    let size = 0;

    // Cleanup function to remove all listeners and prevent memory leaks
    const cleanup = () => {
      stream.removeListener('data', onData);
      stream.removeListener('close', onClose);
      stream.removeListener('error', onError);
    };

    // Named functions required for removeListener to work
    const onData = (chunk: Buffer | string) => {
      size += Buffer.byteLength(chunk);
    };

    const onClose = () => {
      cleanup();
      resolve(size);
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    stream.on('data', onData);
    stream.on('close', onClose);
    stream.on('error', onError);
    stream.resume();
  });

/**
 * Create a writeable Node.js stream that discards received data.
 * Useful for testing, draining a stream of data, etc.
 */
function writableDiscardStream(options?: WritableOptions) {
  return new Writable({
    ...options,
    write(chunk, encding, callback) {
      setImmediate(callback);
    },
  });
}

export {
  streamToBuffer,
  bytesToHumanReadable,
  bytesToKbytes,
  kbytesToBytes,
  getStreamSize,
  writableDiscardStream,
};
