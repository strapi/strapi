/**
 * Utils file containing file treatment utils
 */
import { finished, Writable, WritableOptions } from 'node:stream';

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
    stream.on('data', (chunk) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });

const getStreamSize = (stream: NodeJS.ReadableStream): Promise<number> =>
  new Promise((resolve, reject) => {
    let size = 0;
    const onData = (chunk: string | Uint8Array) => {
      size += Buffer.byteLength(chunk);
    };
    const cleanup = finished(stream, { readable: true, writable: false }, (error) => {
      cleanup();
      stream.removeListener('data', onData);

      if (error) {
        reject(error);
        return;
      }

      resolve(size);
    });

    stream.on('data', onData);
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
