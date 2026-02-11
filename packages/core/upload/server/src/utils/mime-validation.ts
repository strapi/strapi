import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { lookup } from 'mime-types';
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
  detectedMime?: string;
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
    // No file data available - check if file has any readable properties for debugging
    const availableProps = Object.keys(file).filter(
      (key) => key !== 'name' && key !== 'mimetype' && key !== 'type' && key !== 'size'
    );
    if (availableProps.length > 0) {
      // Log available properties for debugging (but don't throw - let validation handle it)
      return undefined;
    }
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

  if (Array.isArray(allowedTypes)) {
    return allowedTypes.length > 0 && matchesMimePattern(mimeType, allowedTypes);
  }

  return true;
}

export function extractFileInfo(file: any) {
  const fileName =
    file.originalFilename ||
    file.name ||
    file.filename ||
    file.newFilename ||
    file.originalname ||
    'unknown';
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

  const fileExt = extname(fileName).toLowerCase();
  const expectedMimeFromExt = fileExt ? lookup(fileExt) : null;

  // 1. Deny: if ANY of (declared, detected, extension) is in deniedTypes → reject
  if (deniedTypes?.length) {
    if (declaredMimeType && matchesMimePattern(declaredMimeType, deniedTypes)) {
      return buildNotAllowedError(
        fileName,
        declaredMimeType,
        detectedMime,
        declaredMimeType,
        config
      );
    }
    if (detectedMime && matchesMimePattern(detectedMime, deniedTypes)) {
      return buildNotAllowedError(fileName, declaredMimeType, detectedMime, detectedMime, config);
    }
    if (expectedMimeFromExt && matchesMimePattern(expectedMimeFromExt, deniedTypes)) {
      return buildNotAllowedError(
        fileName,
        declaredMimeType,
        detectedMime,
        expectedMimeFromExt,
        config
      );
    }
  }

  // 2. Allow fail-safe: if allowedTypes set and NONE of (declared, detected, extension) in allow → reject
  if (Array.isArray(allowedTypes)) {
    const declaredInAllow = declaredMimeType && isMimeTypeAllowed(declaredMimeType, config);
    const detectedInAllow = detectedMime && isMimeTypeAllowed(detectedMime, config);
    const extensionInAllow = expectedMimeFromExt && isMimeTypeAllowed(expectedMimeFromExt, config);
    if (!declaredInAllow && !detectedInAllow && !extensionInAllow) {
      return {
        isValid: false,
        error: {
          code: 'MIME_TYPE_NOT_ALLOWED',
          message: 'MIME type is not allowed',
          details: {
            fileName,
            reason: 'None of declared, detected, or extension MIME type is in the allow list',
            declaredType: declaredMimeType,
            detectedType: detectedMime,
            expectedMimeFromExtension: expectedMimeFromExt,
            allowedTypes,
            deniedTypes,
          },
        },
      };
    }
  }

  // 3. Detected && detected in allow → allow (log warning if extension or declared mismatch)
  if (detectedMime && allowedTypes?.length && isMimeTypeAllowed(detectedMime, config)) {
    if (fileExt && expectedMimeFromExt && detectedMime !== expectedMimeFromExt) {
      strapi.log.warn('MIME type mismatch: detection vs extension', {
        fileName,
        detectedType: detectedMime,
        fileExtension: fileExt,
        expectedMimeFromExtension: expectedMimeFromExt,
      });
    }
    const isDeclaredGeneric = declaredMimeType === 'application/octet-stream' || !declaredMimeType;
    if (!isDeclaredGeneric && declaredMimeType && declaredMimeType !== detectedMime) {
      strapi.log.warn('MIME type mismatch: detection vs declared', {
        fileName,
        detectedType: detectedMime,
        declaredType: declaredMimeType,
      });
    }
    return { isValid: true, detectedMime };
  }

  // 4. !detected: has extension and extension in allow
  if (
    !detectedMime &&
    fileExt &&
    expectedMimeFromExt &&
    isMimeTypeAllowed(expectedMimeFromExt, config)
  ) {
    const isDeclaredTypeGeneric =
      declaredMimeType === 'application/octet-stream' || !declaredMimeType;

    if (expectedMimeFromExt === declaredMimeType) {
      strapi.log.warn('MIME type detection failed, trusting declared type after validation', {
        fileName,
        declaredType: declaredMimeType,
        fileExtension: fileExt,
        expectedMimeFromExtension: expectedMimeFromExt,
        reason: mimeDetectionFailed ? 'Detection threw error' : 'file-type returned undefined',
      });
      return { isValid: true };
    }
    if (isDeclaredTypeGeneric) {
      strapi.log.warn('MIME type detection failed, using extension MIME for storage', {
        fileName,
        fileExtension: fileExt,
        expectedMimeFromExtension: expectedMimeFromExt,
      });
      return { isValid: true, detectedMime: expectedMimeFromExt };
    }
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: 'Cannot verify file type for security reasons',
        details: {
          fileName,
          reason: 'File extension does not match declared MIME type',
          declaredType: declaredMimeType,
          fileExtension: fileExt,
          expectedMimeFromExtension: expectedMimeFromExt,
          hint: 'Ensure the file extension matches the declared Content-Type.',
        },
      },
    };
  }

  // 5. !detected and (no extension or extension not in allow) → reject
  if (!detectedMime && (Array.isArray(allowedTypes) || deniedTypes?.length)) {
    const hasPath = !!(file.path || file.filepath || file.tempFilePath);
    const hasBuffer = !!file.buffer;
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: 'Cannot verify file type for security reasons',
        details: {
          fileName,
          reason: !fileExt
            ? 'Unable to verify file type: no file extension and detection failed'
            : 'Unable to detect MIME type from file content and extension not in allow list',
          declaredType: declaredMimeType,
          mimeDetectionFailed,
          fileHasPath: hasPath,
          fileHasBuffer: hasBuffer,
          fileExtension: fileExt || undefined,
          expectedMimeFromExtension: expectedMimeFromExt || undefined,
          hint:
            !hasPath && !hasBuffer
              ? 'File object missing path or buffer. Ensure multipart parser provides file.filepath or file.buffer.'
              : 'Ensure the file has a recognized extension and content that file-type can detect, or send a matching Content-Type.',
        },
      },
    };
  }

  const mimeToValidate = detectedMime || declaredMimeType;
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

  return { isValid: true, detectedMime };
}

function buildNotAllowedError(
  fileName: string,
  declaredType: string,
  detectedType: string | undefined,
  rejectedType: string,
  config: SecurityConfig
): ValidationResult {
  return {
    isValid: false,
    error: {
      code: 'MIME_TYPE_NOT_ALLOWED',
      message: `File type '${rejectedType}' is not allowed`,
      details: {
        fileName,
        declaredType,
        detectedType,
        finalType: rejectedType,
        allowedTypes: config.allowedTypes,
        deniedTypes: config.deniedTypes,
        reason: 'MIME type is in the denied list',
      },
    },
  };
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
      // Enrich file with detected MIME type for use in storage
      if (result.detectedMime) {
        file.detectedMimeType = result.detectedMime;
      }
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
