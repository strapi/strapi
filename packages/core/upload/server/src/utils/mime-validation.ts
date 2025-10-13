import { fileTypeFromBuffer } from 'file-type';
import { readFile } from 'node:fs/promises';
import type { Core } from '@strapi/types';

export type SecurityConfig = {
  allowedTypes?: string[];
  deniedTypes?: string[];
  maxFileSize?: number;
};

type ValidationResult = {
  isValid: boolean;
  error?: {
    code: 'MIME_TYPE_NOT_ALLOWED' | 'FILE_SIZE_EXCEEDED' | 'VALIDATION_ERROR';
    message: string;
    details: Record<string, any>;
  };
};

async function readFileChunk(filePath: string, chunkSize: number = 4100): Promise<Buffer> {
  const buffer = await readFile(filePath);
  return buffer.length > chunkSize ? buffer.subarray(0, chunkSize) : buffer;
}

export async function detectMimeType(file: any): Promise<string | undefined> {
  try {
    let buffer: Buffer;

    // Check for different path properties
    const filePath = file.path || file.filepath || file.tempFilePath;

    if (filePath) {
      // Read from file path
      buffer = await readFileChunk(filePath, 4100);
    } else if (file.buffer) {
      // Use buffer directly if available
      buffer = file.buffer.length > 4100 ? file.buffer.subarray(0, 4100) : file.buffer;
    } else {
      return undefined;
    }

    const result = await fileTypeFromBuffer(new Uint8Array(buffer));

    return result?.mime;
  } catch (error) {
    return undefined;
  }
}

function matchesMimePattern(mimeType: string, patterns: string[]): boolean {
  if (!patterns?.length) return false;

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.toLowerCase();
    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedPattern.includes('*')) {
      // Simple approach: just replace * with .* for regex
      const regexPattern = normalizedPattern.replace(/\*/g, '.*');

      const regex = new RegExp(`^${regexPattern}$`);
      const matches = regex.test(normalizedMimeType);
      return matches;
    }

    // Exact match (case insensitive)
    const exactMatch = normalizedPattern === normalizedMimeType;
    return exactMatch;
  });
}

export function isMimeTypeAllowed(mimeType: string, config: SecurityConfig): boolean {
  const { allowedTypes, deniedTypes } = config;

  if (!mimeType) return false;

  // Check deny list first (takes precedence)
  if (deniedTypes?.length && matchesMimePattern(mimeType, deniedTypes)) {
    return false;
  }

  // If allow list exists, check if mime type matches any pattern
  if (allowedTypes?.length) {
    return matchesMimePattern(mimeType, allowedTypes);
  }

  // If no allow list, allow by default (unless denied above)
  return true;
}

export function isFileSizeAllowed(fileSize: number, maxFileSize?: number): boolean {
  if (typeof maxFileSize !== 'number' || maxFileSize <= 0) {
    return true;
  }
  return fileSize <= maxFileSize;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function extractFileInfo(file: any) {
  const fileName =
    file.originalFilename || file.name || file.filename || file.newFilename || 'unknown';
  const fileSize = file.size || file.length || 0;
  const declaredMimeType = file.mimetype || file.type || file.mimeType || file.mime || '';

  return { fileName, fileSize, declaredMimeType };
}

export async function validateFile(
  file: any,
  config: SecurityConfig,
  strapi: Core.Strapi
): Promise<ValidationResult> {
  const { allowedTypes, deniedTypes, maxFileSize } = config;

  if (!allowedTypes && !deniedTypes && !maxFileSize) {
    return { isValid: true };
  }

  const { fileName, fileSize, declaredMimeType } = extractFileInfo(file);

  let detectedMime: string | undefined;
  let mimeDetectionFailed = false;

  // Try to detect MIME type from file content
  try {
    detectedMime = await detectMimeType(file);
  } catch (error) {
    mimeDetectionFailed = true;
    strapi.log.warn('Failed to detect MIME type from file', {
      fileName,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Determine final MIME type to validate
  const mimeToValidate = detectedMime || declaredMimeType;

  // Security policy: If we can't detect MIME type AND declared type is generic, be strict
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

  // Check file size first
  if (maxFileSize && fileSize && !isFileSizeAllowed(fileSize, maxFileSize)) {
    return {
      isValid: false,
      error: {
        code: 'FILE_SIZE_EXCEEDED',
        message: `File '${fileName}' exceeds maximum allowed size`,
        details: {
          fileName,
          fileSize,
          maxFileSize,
          fileSizeFormatted: formatBytes(fileSize),
          maxFileSizeFormatted: formatBytes(maxFileSize),
        },
      },
    };
  }

  // Check MIME type restrictions (only if we have a MIME type to validate)
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

  if (!config.allowedTypes && !config.deniedTypes && !config.maxFileSize) {
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
  validFileNames: string[]; // Return names for filtering
  errors: Array<{
    file: any;
    originalIndex: number;
    error: {
      code: 'MIME_TYPE_NOT_ALLOWED' | 'FILE_SIZE_EXCEEDED' | 'VALIDATION_ERROR';
      message: string;
      details: Record<string, any>;
    };
  }>;
}> {
  const validationResults = await validateFiles(files, strapi);
  const filesArray = Array.isArray(files) ? files : [files];
  
  const validFiles: any[] = [];
  const validFileNames: string[] = [];
  const errors: Array<{
    file: any;
    originalIndex: number;
    error: {
      code: 'MIME_TYPE_NOT_ALLOWED' | 'FILE_SIZE_EXCEEDED' | 'VALIDATION_ERROR';
      message: string;
      details: Record<string, any>;
    };
  }> = [];

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
    }
  }

  return { validFiles, validFileNames, errors };
}
