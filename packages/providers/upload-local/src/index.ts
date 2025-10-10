import { pipeline } from 'stream';
import fs, { ReadStream } from 'fs';
import path from 'path';
import fse from 'fs-extra';
import * as utils from '@strapi/utils';

// Needed to load global.strapi without having to put @strapi/types in the regular dependencies
import type {} from '@strapi/types';

interface File {
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: Record<string, unknown>;
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  sizeInBytes: number;
  url: string;
  previewUrl?: string;
  path?: string;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
  stream?: ReadStream;
  buffer?: Buffer;
}

const { PayloadTooLargeError } = utils.errors;
const { kbytesToBytes, bytesToHumanReadable } = utils.file;

const UPLOADS_FOLDER_NAME = 'uploads';

interface InitOptions {
  sizeLimit?: number;
}

interface CheckFileSizeOptions {
  sizeLimit?: number;
}

export default {
  init({ sizeLimit: providerOptionsSizeLimit }: InitOptions = {}) {
    // TODO V5: remove providerOptions sizeLimit
    if (providerOptionsSizeLimit) {
      process.emitWarning(
        '[deprecated] In future versions, "sizeLimit" argument will be ignored from upload.config.providerOptions. Move it to upload.config'
      );
    }

    // Ensure uploads folder exists
    const uploadPath = path.resolve(strapi.dirs.static.public, UPLOADS_FOLDER_NAME);
    if (!fse.pathExistsSync(uploadPath)) {
      throw new Error(
        `The upload folder (${uploadPath}) doesn't exist or is not accessible. Please make sure it exists.`
      );
    }

    return {
      checkFileSize(file: File, options: CheckFileSizeOptions) {
        const { sizeLimit } = options ?? {};

        // TODO V5: remove providerOptions sizeLimit
        if (providerOptionsSizeLimit) {
          if (kbytesToBytes(file.size) > providerOptionsSizeLimit)
            throw new PayloadTooLargeError(
              `${file.name} exceeds size limit of ${bytesToHumanReadable(
                providerOptionsSizeLimit
              )}.`
            );
        } else if (sizeLimit) {
          if (kbytesToBytes(file.size) > sizeLimit)
            throw new PayloadTooLargeError(
              `${file.name} exceeds size limit of ${bytesToHumanReadable(sizeLimit)}.`
            );
        }
      },
      uploadStream(file: File): Promise<void> {
        if (!file.stream) {
          return Promise.reject(new Error('Missing file stream'));
        }

        const { stream } = file;

        return new Promise((resolve, reject) => {
          pipeline(
            stream,
            fs.createWriteStream(path.join(uploadPath, `${file.hash}${file.ext}`)),
            (err) => {
              if (err) {
                return reject(err);
              }

              file.url = `/${UPLOADS_FOLDER_NAME}/${file.hash}${file.ext}`;

              resolve();
            }
          );
        });
      },
      upload(file: File): Promise<void> {
        if (!file.buffer) {
          return Promise.reject(new Error('Missing file buffer'));
        }

        const { buffer } = file;

        return new Promise((resolve, reject) => {
          // write file in public/assets folder
          fs.writeFile(path.join(uploadPath, `${file.hash}${file.ext}`), buffer, (err) => {
            if (err) {
              return reject(err);
            }

            file.url = `/${UPLOADS_FOLDER_NAME}/${file.hash}${file.ext}`;

            resolve();
          });
        });
      },
      delete(file: File): Promise<string | void> {
        return new Promise((resolve, reject) => {
          const filePath = path.join(uploadPath, `${file.hash}${file.ext}`);

          if (!fs.existsSync(filePath)) {
            resolve("File doesn't exist");
            return;
          }

          // remove file from public/assets folder
          fs.unlink(filePath, (err) => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      },
    };
  },
};
