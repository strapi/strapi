import { readFile } from 'node:fs/promises';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

export type SecurityConfig = {
  allowedTypes?: string[];
  deniedTypes?: string[];
};
type UploadValidationError = {
  code: 'MIME_TYPE_NOT_ALLOWED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details: Record<string, any>;
};

type ValidationResult = {
  isValid: boolean;
  error?: UploadValidationError;
};

type ErrorDetail = {
  file: any;
  originalIndex: number;
  error: UploadValidationError;
};

async function readFileChunk(filePath: string, chunkSize: number = 4100): Promise<Buffer> {
  const buffer = await readFile(filePath);
  return buffer.length > chunkSize ? buffer.subarray(0, chunkSize) : buffer;
}

export async function detectMimeType(file: any): Promise<string | undefined> {
  let buffer: Buffer;

  const filePath = file.path || file.filepath || file.tempFilePath;

  if (filePath) {
    try {
      buffer = await readFileChunk(filePath, 4100);
    } catch (error) {
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else if (file.buffer) {
    buffer = file.buffer.length > 4100 ? file.buffer.subarray(0, 4100) : file.buffer;
  } else {
    // No file data available
    return undefined;
  }

  try {
    /**
     * Use dynamic import to support file-type which is ESM-only
     * Static imports fail during CommonJS build since bundler can't transform ESM-only packages
     * @see https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
     */
    const { fileTypeFromBuffer } = await import('file-type');

    const result = await fileTypeFromBuffer(new Uint8Array(buffer));
    return result?.mime;
  } catch (error) {
    throw new Error(
      `Failed to detect MIME type: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function matchesMimePattern(mimeType: string, patterns: string[]): boolean {
  if (!patterns?.length) return false;

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.toLowerCase();
    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedPattern.includes('*')) {
      const regexPattern = normalizedPattern.replace(/\*/g, '.*');

      const regex = new RegExp(`^${regexPattern}$`);
      const matches = regex.test(normalizedMimeType);
      return matches;
    }

    const exactMatch = normalizedPattern === normalizedMimeType;
    return exactMatch;
  });
}

export function isMimeTypeAllowed(mimeType: string, config: SecurityConfig): boolean {
  const { allowedTypes, deniedTypes } = config;

  if (!mimeType) return false;

  if (deniedTypes?.length && matchesMimePattern(mimeType, deniedTypes)) {
    return false;
  }

  if (allowedTypes?.length) {
    return matchesMimePattern(mimeType, allowedTypes);
  }

  return true;
}

export function extractFileInfo(file: any) {
  const fileName =
    file.originalFilename || file.name || file.filename || file.newFilename || 'unknown';
  const declaredMimeType = file.mimetype || file.type || file.mimeType || file.mime || '';

  return { fileName, declaredMimeType };
}

export async function validateFile(
  file: any,
  config: SecurityConfig,
  strapi: Core.Strapi
): Promise<ValidationResult> {
  const { allowedTypes, deniedTypes } = config;

  if (!allowedTypes && !deniedTypes) {
    return { isValid: true };
  }

  const { fileName, declaredMimeType } = extractFileInfo(file);

  let detectedMime: string | undefined;
  let mimeDetectionFailed = false;

  try {
    detectedMime = await detectMimeType(file);
  } catch (error) {
    mimeDetectionFailed = true;
    strapi.log.warn('Failed to detect MIME type from file', {
      fileName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const mimeToValidate = detectedMime || declaredMimeType;

  if (
    !detectedMime &&
    (declaredMimeType === 'application/octet-stream' || !declaredMimeType || mimeDetectionFailed)
  ) {
    if (allowedTypes?.length || deniedTypes?.length) {
      return {
        isValid: false,
        error: {
          code: 'MIME_TYPE_NOT_ALLOWED',
          message: `Cannot verify file type for security reasons`,
          details: {
            fileName,
            reason: 'Unable to detect MIME type from file content',
            declaredType: declaredMimeType,
            mimeDetectionFailed,
          },
        },
      };
    }
  }

  if (
    mimeToValidate &&
    (allowedTypes || deniedTypes) &&
    !isMimeTypeAllowed(mimeToValidate, config)
  ) {
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: `File type '${mimeToValidate}' is not allowed`,
        details: {
          fileName,
          detectedType: detectedMime,
          declaredType: declaredMimeType,
          finalType: mimeToValidate,
          allowedTypes,
          deniedTypes,
        },
      },
    };
  }

  return { isValid: true };
}

export async function validateFiles(files: any, strapi: Core.Strapi): Promise<ValidationResult[]> {
  const filesArray = Array.isArray(files) ? files : [files];

  if (!filesArray.length) {
    return [];
  }

  const config: SecurityConfig = strapi.config.get('plugin::upload.security', {});
  if (
    config.allowedTypes &&
    (!Array.isArray(config.allowedTypes) ||
      !config.allowedTypes.every((item) => typeof item === 'string'))
  ) {
    throw new errors.ApplicationError(
      'Invalid configuration: allowedTypes must be an array of strings.'
    );
  }

  if (
    config.deniedTypes &&
    (!Array.isArray(config.deniedTypes) ||
      !config.deniedTypes.every((item) => typeof item === 'string'))
  ) {
    throw new errors.ApplicationError(
      'Invalid configuration: deniedTypes must be an array of strings.'
    );
  }

  if (!config.allowedTypes && !config.deniedTypes) {
    strapi.log.warn(
      'No upload security configuration found. Consider configuring plugin.upload.security for enhanced file validation.'
    );
    return filesArray.map(() => ({ isValid: true }));
  }

  const validationPromises = filesArray.map(async (file, index) => {
    try {
      return await validateFile(file, config, strapi);
    } catch (error) {
      strapi.log.error('Unexpected error during file validation', {
        fileIndex: index,
        fileName: file?.name || file?.originalname,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isValid: false,
        error: {
          code: 'VALIDATION_ERROR' as const,
          message: `Validation failed for file at index ${index}`,
          details: {
            index,
            fileName: file?.name || file?.originalname,
            originalError: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  });

  return Promise.all(validationPromises);
}

export async function enforceUploadSecurity(
  files: any,
  strapi: Core.Strapi
): Promise<{
  validFiles: any[];
  validFileNames: string[];
  errors: Array<ErrorDetail>;
}> {
  const validationResults = await validateFiles(files, strapi);
  const filesArray = Array.isArray(files) ? files : [files];

  const validFiles: any[] = [];
  const validFileNames: string[] = [];
  const errors: Array<ErrorDetail> = [];

  for (const [index, result] of validationResults.entries()) {
    if (result.isValid) {
      const file = filesArray[index];
      validFiles.push(file);
      validFileNames.push(file.originalFilename || file.name);
    } else if (result.error) {
      errors.push({
        file: filesArray[index],
        originalIndex: index,
        error: result.error,
      });
    } else {
      // Handle case where validation failed but no error details are provided
      errors.push({
        file: filesArray[index],
        originalIndex: index,
        error: {
          code: 'UNKNOWN_ERROR' as const,
          message: 'File validation failed for unknown reason',
          details: {
            index,
            fileName: filesArray[index]?.name || filesArray[index]?.originalname,
          },
        },
      });
    }
  }

  return { validFiles, validFileNames, errors };
}

export type PrepareUploadResult = {
  validFiles: any[];
  filteredBody: any;
};

/**
 * Prepare files and body for upload by enforcing security and parsing fileInfo
 */
export async function prepareUploadRequest(
  filesInput: any,
  body: any,
  strapi: Core.Strapi
): Promise<PrepareUploadResult> {
  const securityResults = await enforceUploadSecurity(filesInput, strapi);

  if (securityResults.validFiles.length === 0) {
    throw new errors.ValidationError(
      securityResults.errors[0].error.message,
      securityResults.errors[0].error.details
    );
  }

  let filteredBody = body;
  if (body?.fileInfo) {
    // Parse JSON strings in fileInfo
    let parsedFileInfo = body.fileInfo;
    if (Array.isArray(body.fileInfo)) {
      parsedFileInfo = body.fileInfo.map((fi: any) =>
        typeof fi === 'string' ? JSON.parse(fi) : fi
      );
    } else if (typeof body.fileInfo === 'string') {
      parsedFileInfo = JSON.parse(body.fileInfo);
    }

    // Filter fileInfo by index - only keep entries for files that passed validation
    if (Array.isArray(parsedFileInfo)) {
      const invalidIndices = new Set(securityResults.errors.map((e) => e.originalIndex));
      const filteredFileInfo = parsedFileInfo.filter(
        (_: any, index: number) => !invalidIndices.has(index)
      );

      if (filteredFileInfo.length === 1) {
        filteredBody = {
          ...body,
          fileInfo: filteredFileInfo[0],
        };
      } else {
        filteredBody = {
          ...body,
          fileInfo: filteredFileInfo,
        };
      }
    } else {
      filteredBody = {
        ...body,
        fileInfo: parsedFileInfo,
      };
    }
  }

  return {
    validFiles: securityResults.validFiles,
    filteredBody,
  };
}
