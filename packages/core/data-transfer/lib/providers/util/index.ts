import { PassThrough } from 'stream-chain';

export const onItemPassthrough = (cb: Function) => {
  return new PassThrough({
    objectMode: true,
    transform: (data, _encoding, callback) => {
      cb();
      callback(null, data);
    },
  });
};
