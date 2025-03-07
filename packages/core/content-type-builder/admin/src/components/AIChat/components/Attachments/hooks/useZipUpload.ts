import { useState } from 'react';

import JSZip from 'jszip';
import micromatch from 'micromatch';

import { STRAPI_CODE_MIME_TYPE } from '../../../lib/constants';

export interface ProjectFile {
  path: string;
  content: string;
}

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.md'];

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

export interface ProcessZipOptions {
  /**
   * Additional glob patterns to ignore
   */
  ignorePatterns?: string[];
}

export async function processZipFile(
  file: File,
  options: ProcessZipOptions = {}
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
          content,
        });
      } catch (err) {
        console.warn(`Failed to read file ${filename}:`, err);
      }
    })
  );

  // Sort files by path for consistency
  return processedFiles.sort((a, b) => a.path.localeCompare(b.path));
}

interface UseZipUploadOptions {
  onSuccess?: (file: File, projectName: string) => void;
  onError?: (error: string) => void;
}

export function useZipUpload({ onSuccess, onError }: UseZipUploadOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      const errorMessage = 'Please upload a zip file';
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const projectName = file.name.replace('.zip', '');

      const processedFiles = await processZipFile(file, {
        ignorePatterns: ['**/node_modules/**'],
      });

      // Create project data
      const projectData = {
        name: projectName,
        type: 'code',
        timestamp: new Date().toISOString(),
        files: processedFiles,
      };

      // Upload to server
      const response = await fetch('http://localhost:3001/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to upload project');
      }

      const { id } = await response.json();

      // Create a file object for the chat
      const projectFile = new File([id], projectName, {
        type: STRAPI_CODE_MIME_TYPE,
      });

      onSuccess?.(projectFile, projectName);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process zip file. Please try again.';

      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Error processing zip:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processFile,
    isLoading,
    error,
  };
}
