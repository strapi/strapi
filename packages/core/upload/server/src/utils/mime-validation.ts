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

  // Support multiple property names used by different multipart parsers (formidable uses filepath)
  const filePath = file.filepath ?? file.path ?? file.tempFilePath ?? file.filePath;

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
    // No file path or buffer; cannot detect MIME. Validation will use declared/extension or reject.
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

/**
 * Single gate for allow/deny. Returns ValidationResult.
 * Doc: docs/docs/01-core/upload/01-backend/01-mime-validation.md
 */
function validateAllowBanLists(
  mimetype: string,
  fileName: string,
  declaredType: string,
  detectedType: string | undefined,
  config: SecurityConfig
): ValidationResult {
  if (!mimetype) {
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: 'MIME type is not allowed',
        details: {
          fileName,
          reason: 'No MIME type to validate',
          declaredType,
          detectedType,
          allowedTypes: config.allowedTypes,
          deniedTypes: config.deniedTypes,
        },
      },
    };
  }
  if (config.deniedTypes?.length && matchesMimePattern(mimetype, config.deniedTypes)) {
    return buildNotAllowedError(fileName, declaredType, detectedType, mimetype, config);
  }
  if (!Array.isArray(config.allowedTypes)) {
    return { isValid: true, detectedMime: mimetype };
  }
  if (config.allowedTypes.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: 'MIME type is not allowed',
        details: {
          fileName,
          reason: 'Allow list is empty',
          declaredType,
          detectedType,
          allowedTypes: config.allowedTypes,
          deniedTypes: config.deniedTypes,
        },
      },
    };
  }
  if (matchesMimePattern(mimetype, config.allowedTypes)) {
    return { isValid: true, detectedMime: mimetype };
  }
  return {
    isValid: false,
    error: {
      code: 'MIME_TYPE_NOT_ALLOWED',
      message: `File type '${mimetype}' is not allowed`,
      details: {
        fileName,
        declaredType,
        detectedType,
        finalType: mimetype,
        allowedTypes: config.allowedTypes,
        deniedTypes: config.deniedTypes,
      },
    },
  };
}

function isDeclaredGeneric(declaredMimeType: string): boolean {
  return !declaredMimeType || declaredMimeType === 'application/octet-stream';
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

  const { fileName, declaredMimeType } = extractFileInfo(file);

  const fileExt = extname(fileName).toLowerCase();
  const expectedMimeFromExt = fileExt ? lookup(fileExt) || null : null;

  // Reject if declared type is denied.
  if (
    !isDeclaredGeneric(declaredMimeType) &&
    deniedTypes?.length &&
    matchesMimePattern(declaredMimeType, deniedTypes)
  ) {
    return buildNotAllowedError(fileName, declaredMimeType, undefined, declaredMimeType, config);
  }

  // Reject if extension's type is denied.
  if (
    expectedMimeFromExt &&
    deniedTypes?.length &&
    matchesMimePattern(expectedMimeFromExt, deniedTypes)
  ) {
    return buildNotAllowedError(fileName, declaredMimeType, undefined, expectedMimeFromExt, config);
  }

  // Run content detection.
  let detectedMime: string | undefined;
  try {
    detectedMime = await detectMimeType(file);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    strapi.log.warn(`Failed to detect MIME type from file: ${errMsg}`, {
      fileName,
      error: errMsg,
    });
  }

  const declaredMatchesExtension =
    !isDeclaredGeneric(declaredMimeType) &&
    expectedMimeFromExt !== null &&
    expectedMimeFromExt !== undefined &&
    (matchesMimePattern(declaredMimeType, [expectedMimeFromExt]) ||
      matchesMimePattern(expectedMimeFromExt, [declaredMimeType]));
  const detectedMatchesDeclared =
    detectedMime && declaredMimeType && matchesMimePattern(detectedMime, [declaredMimeType]);

  // Trusted declaration: declared matches extension and detection confirms.
  if (declaredMatchesExtension && detectedMatchesDeclared) {
    return validateAllowBanLists(
      declaredMimeType,
      fileName,
      declaredMimeType,
      detectedMime,
      config
    );
  }

  // Reject if detected type is denied.
  if (detectedMime && deniedTypes?.length && matchesMimePattern(detectedMime, deniedTypes)) {
    return buildNotAllowedError(fileName, declaredMimeType, detectedMime, detectedMime, config);
  }

  // Reject if detected is not in allow list (extension/declared cannot override).
  // Exception: file-type often returns application/zip for Office formats (docx, xlsx); skip so the next block can allow via extension type.
  const isZipWithAllowedExt =
    detectedMime === 'application/zip' &&
    expectedMimeFromExt &&
    expectedMimeFromExt !== 'application/zip' &&
    Array.isArray(allowedTypes) &&
    allowedTypes.length > 0 &&
    matchesMimePattern(expectedMimeFromExt, allowedTypes);
  if (
    detectedMime &&
    Array.isArray(allowedTypes) &&
    allowedTypes.length > 0 &&
    !matchesMimePattern(detectedMime, allowedTypes) &&
    !isZipWithAllowedExt
  ) {
    return {
      isValid: false,
      error: {
        code: 'MIME_TYPE_NOT_ALLOWED',
        message: 'MIME type is not allowed',
        details: {
          fileName,
          reason:
            'File content was detected as a type not in the allow list; extension or declared type cannot override',
          declaredType: declaredMimeType,
          detectedType: detectedMime,
          expectedMimeFromExtension: expectedMimeFromExt,
          allowedTypes,
          deniedTypes,
        },
      },
    };
  }

  // Use detected type when defined and (no extension, or detected matches extension, or declared is generic).
  const detectedMatchesExtension =
    detectedMime &&
    expectedMimeFromExt !== null &&
    expectedMimeFromExt !== undefined &&
    matchesMimePattern(detectedMime, [expectedMimeFromExt]);
  if (
    detectedMime &&
    (!expectedMimeFromExt || detectedMatchesExtension || isDeclaredGeneric(declaredMimeType))
  ) {
    // Office/zip exception: use extension type when detection returned application/zip and extension is in allow list.
    if (
      detectedMime === 'application/zip' &&
      expectedMimeFromExt &&
      expectedMimeFromExt !== 'application/zip'
    ) {
      const extResult = validateAllowBanLists(
        expectedMimeFromExt,
        fileName,
        declaredMimeType,
        detectedMime,
        config
      );
      if (extResult.isValid) {
        strapi.log.warn(
          'MIME type detection returned application/zip; trusting extension for allow list',
          { fileName, fileExtension: fileExt, expectedMimeFromExtension: expectedMimeFromExt }
        );
        return extResult;
      }
    }
    return validateAllowBanLists(detectedMime, fileName, declaredMimeType, detectedMime, config);
  }

  // Use extension's type when present.
  if (expectedMimeFromExt) {
    return validateAllowBanLists(
      expectedMimeFromExt,
      fileName,
      declaredMimeType,
      detectedMime,
      config
    );
  }

  // Use declared type as last resort.
  if (declaredMimeType) {
    return validateAllowBanLists(
      declaredMimeType,
      fileName,
      declaredMimeType,
      detectedMime,
      config
    );
  }

  // Reject when no type can be chosen.
  return {
    isValid: false,
    error: {
      code: 'MIME_TYPE_NOT_ALLOWED',
      message: 'Cannot verify file type for security reasons',
      details: {
        fileName,
        reason: 'No MIME type to validate (no declared type, no extension, no detection)',
        declaredType: declaredMimeType,
        detectedType: detectedMime,
        allowedTypes,
        deniedTypes,
      },
    },
  };
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

  // Use array path so 'plugin::upload' is a single key (lodash string path splits on '.')
  let config: SecurityConfig = strapi.config.get(
    ['plugin::upload', 'security'],
    {}
  ) as SecurityConfig;
  if (!config || typeof config !== 'object') {
    config = {};
  }
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
    // Do not return; we still run validation so MIME detection runs and stored file gets detected type when possible
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

export type FileUploadError = {
  name: string;
  message: string;
};

export type PrepareUploadResult = {
  validFiles: any[];
  filteredBody: any;
  errors: FileUploadError[];
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

  // Map errors to simplified format
  const uploadErrors: FileUploadError[] = securityResults.errors.map((e) => ({
    name: e.file?.originalFilename || e.file?.name || 'unknown',
    message: e.error.message,
  }));

  return {
    validFiles: securityResults.validFiles,
    filteredBody,
    errors: uploadErrors,
  };
}
