import { StringDecoder } from 'node:string_decoder';
import { Transform, type TransformCallback, type TransformOptions } from 'node:stream';

export interface JsonlParserOptions extends TransformOptions {
  checkErrors?: boolean;
}

export const parser = (options: JsonlParserOptions = {}) => {
  let lineNumber = 0;
  let remainder = '';
  const decoder = new StringDecoder('utf8');

  const parse = function (this: Transform, line: string, callback: TransformCallback) {
    if (line.length === 0) {
      return callback();
    }

    try {
      this.push({ key: String(lineNumber), value: JSON.parse(line) });
      lineNumber += 1;
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return new Transform({
    ...options,
    readableObjectMode: true,
    transform(chunk: Buffer, _encoding, callback) {
      remainder += decoder.write(chunk);
      const lines = remainder.split(/\r?\n/);
      remainder = lines.pop() ?? '';

      let index = 0;
      const processNext = () => {
        if (index === lines.length) {
          callback();
          return;
        }

        parse.call(this, lines[index], (error) => {
          if (error) {
            callback(error);
            return;
          }
          index += 1;
          processNext();
        });
      };

      processNext();
    },
    flush(callback) {
      remainder += decoder.end();
      if (remainder.length === 0) {
        callback();
        return;
      }

      parse.call(this, remainder, callback);
    },
  });
};

export const stringer = (options: TransformOptions = {}) => {
  return new Transform({
    ...options,
    writableObjectMode: true,
    transform(value, _encoding, callback) {
      try {
        callback(null, `${JSON.stringify(value)}\n`);
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
  });
};
