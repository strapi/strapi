import { useState } from 'react';

import JSZip from 'jszip';
import micromatch from 'micromatch';

import { generateId } from '../lib/misc';
import { Attachment } from '../lib/types/attachments';
import { useStrapiChat } from '../providers/ChatProvider';

import { useFetchUploadProject } from './useAIFetch';

export interface ProjectFile {
  path: string;
  content: string;
}

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json'];
const MAX_LINES_PER_FILE = 5000; // Maximum number of lines per file

// Common patterns to ignore
const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/test/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
];

const isAllowedFile = (filename: string, ignorePatterns: string[] = []) => {
  // Check if file matches any ignore pattern
  if (micromatch.isMatch(filename, [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns])) {
    return false;
  }

  // Check if file has allowed extension
  return ALLOWED_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext));
};

/**
 * Prunes file content if it exceeds MAX_LINES
 */
const pruneFileContent = (content: string): string => {
  const lines = content.split('\n');

  if (lines.length <= MAX_LINES_PER_FILE) {
    return content;
  }

  const truncated = lines.slice(0, MAX_LINES_PER_FILE).join('\n');

  return `${truncated}\n\n// ... [${lines.length - MAX_LINES_PER_FILE} lines truncated, file too long] ...\n\n`;
};

/* -------------------------------------------------------------------------------------------------
 * File processing options
 * -----------------------------------------------------------------------------------------------*/
export interface ProcessOptions {
  /**
   * Additional glob patterns to ignore
   */
  ignorePatterns?: string[];
}

/* -------------------------------------------------------------------------------------------------
 * Zip file processing
 * -----------------------------------------------------------------------------------------------*/
export async function openZipFile(
  file: File,
  options: ProcessOptions = {}
): Promise<ProjectFile[]> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const processedFiles: ProjectFile[] = [];

  // Process all files in parallel
  await Promise.all(
    Object.keys(contents.files).map(async (filename) => {
      const zipEntry = contents.files[filename];

      // Skip directories and non-allowed files
      if (zipEntry.dir || !isAllowedFile(filename, options.ignorePatterns)) {
        return;
      }

      try {
        const content = await zipEntry.async('string');
        processedFiles.push({
          path: filename,
          content: pruneFileContent(content),
        });
      } catch (err) {
        console.warn(`Failed to read file ${filename}:`, err);
      }
    })
  );

  // Sort files by path for consistency
  return processedFiles.sort((a, b) => a.path.localeCompare(b.path));
}

/* -------------------------------------------------------------------------------------------------
 * Folder processing
 * -----------------------------------------------------------------------------------------------*/
export async function processFolder(
  files: FileList | File[],
  options: ProcessOptions = {}
): Promise<{ files: ProjectFile[]; projectName: string }> {
  const processedFiles: ProjectFile[] = [];
  let folderName = 'Project';

  // Extract folder name from the first file's path
  if (files.length > 0) {
    const firstFile = files[0];
    const folderPath = firstFile.webkitRelativePath || '';
    const pathParts = folderPath.split('/');
    if (pathParts.length > 0 && pathParts[0]) {
      folderName = pathParts[0];
    }
  }

  // Process all files in parallel
  await Promise.all(
    Array.from(files).map(async (file) => {
      const filePath = file.webkitRelativePath || file.name;

      // Skip non-allowed files
      if (!isAllowedFile(filePath, options.ignorePatterns)) {
        return;
      }

      try {
        const content = await file.text();
        processedFiles.push({
          // Remove the root folder name from the path
          path: filePath.includes('/') ? filePath.substring(filePath.indexOf('/') + 1) : filePath,
          content: pruneFileContent(content),
        });
      } catch (err) {
        console.warn(`Failed to read file ${filePath}:`, err);
      }
    })
  );

  // Sort files by path for consistency
  return {
    files: processedFiles.sort((a, b) => a.path.localeCompare(b.path)),
    projectName: folderName,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Zip file processing
 * -----------------------------------------------------------------------------------------------*/
export async function processZipFile(
  file: File,
  options: ProcessOptions = {}
): Promise<{ files: ProjectFile[]; projectName: string }> {
  const projectName = file.name.replace('.zip', '');
  const files = await openZipFile(file, options);

  return {
    files,
    projectName,
  };
}

/* -------------------------------------------------------------------------------------------------
 * Upload files
 * -----------------------------------------------------------------------------------------------*/

interface UseCodeUploadOptions {
  onSuccess?: (attachment: Attachment, projectName: string) => void;
  onError?: (error: string) => void;
}

export function useCodeUpload({ onSuccess, onError }: UseCodeUploadOptions = {}) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    fetch: fetchUploadProject,
    isPending: isFetching,
    error: fetchError,
  } = useFetchUploadProject();
  const { id: chatId } = useStrapiChat();

  /**
   * Upload processed files to the server
   */
  const processFiles = async (projectName: string, processedFiles: ProjectFile[]) => {
    // Upload to server
    const result = await fetchUploadProject({
      body: {
        chatId,
        name: projectName,
        type: 'code',
        files: processedFiles,
      },
    });

    if (!result?.data) {
      throw new Error('Failed to upload project');
    }

    return result.data;
  };

  const handleZipFile = async (file: File) => {
    try {
      setError(null);
      setIsProcessing(true);

      const { files: processedFiles, projectName } = await processZipFile(file, {
        ignorePatterns: ['**/node_modules/**'],
      });

      const projectAttachment = await processFiles(projectName, processedFiles);

      onSuccess?.({ ...projectAttachment, id: generateId(), status: 'ready' }, projectName);
      return projectAttachment;
    } catch (err) {
      setError('Failed to process zip file');
      onError?.('Failed to process zip file');
      console.error('Error processing zip:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFolder = async (files: FileList | File[]) => {
    try {
      setError(null);
      setIsProcessing(true);

      const { files: processedFiles, projectName } = await processFolder(files, {
        ignorePatterns: ['**/node_modules/**'],
      });

      const projectAttachment = await processFiles(projectName, processedFiles);

      onSuccess?.({ ...projectAttachment, id: generateId(), status: 'ready' }, projectName);
      return projectAttachment;
    } catch (err) {
      setError('Failed to process folder');
      onError?.('Failed to process folder');
      console.error('Error processing folder:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processZipFile: handleZipFile,
    processFolder: handleFolder,
    isLoading: isProcessing || isFetching,
    error: fetchError || error,
  };
}
