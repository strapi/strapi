import { useState } from 'react';

import type { Attachment } from '../lib/types/attachments';

/**================================================================================
 * Constants
 *================================================================================*/
export const FIGMA_TOKEN_STORAGE_KEY = 'strapi-ai-figma-token';

/**================================================================================
 * Types
 *================================================================================*/
export interface FigmaNodeData {
  id: string;
  name: string;
  type: string;
  children?: FigmaNodeData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For other properties that Figma nodes may have
}

export interface FigmaFileData {
  document: FigmaNodeData;
  schemaVersion: number;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
}

export interface FigmaImage extends Attachment {}

interface UseFigmaUploadOptions {
  onSuccess?: (attachments: FigmaImage[]) => void;
  onError?: (error: string) => void;
}

/**================================================================================
 * Token Storage Utils
 *================================================================================*/

/**
 * Get Figma token from localStorage
 */
export const getFigmaToken = (): string => {
  try {
    return localStorage.getItem(FIGMA_TOKEN_STORAGE_KEY) || '';
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return '';
  }
};

/**
 * Save Figma token to localStorage
 */
export const saveFigmaToken = (token: string): void => {
  try {
    localStorage.setItem(FIGMA_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * Check if Figma token exists in localStorage
 */
export const hasFigmaToken = (): boolean => {
  return !!getFigmaToken();
};

/**================================================================================
 * Utils
 *================================================================================*/

/**
 * Extract file key and node ID from Figma URL
 * @param figmaUrl - Figma URL (e.g., https://www.figma.com/file/KEY/Title)
 */
const extractNodeFromFigmaUrl = (figmaUrl: string) => {
  const figmaUrlPattern = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)\/.*[?&]node-id=([^&]+)/;
  const match = figmaUrl.match(figmaUrlPattern);

  if (!match) {
    throw new Error('Invalid Figma URL');
  }

  const fileKey = match[1];
  const nodeId = decodeURIComponent(match[2]).replace(/-/g, ':');

  return { fileKey, nodeId };
};

/**
 * Get token and validate it's available
 * @throws Error if token is not available
 */
const getValidToken = (): string => {
  const token = getFigmaToken();
  if (!token) {
    throw new Error('Figma API token is required');
  }
  return token;
};

/**
 * Fetch Figma file data using the API
 * @param fileKey - Figma file key
 * @param nodeId - Figma node ID
 */
const fetchFigmaNode = async (fileKey: string, nodeId: string): Promise<FigmaFileData> => {
  const token = getValidToken();

  try {
    const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-Figma-Token': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const nodes = await response.json();

    return nodes.nodes[nodeId];
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Figma data';
    throw new Error(errorMessage);
  }
};

/**
 * Recursively searches the node tree for FRAME nodes.
 * It stops searching within a branch once a FRAME is found.
 * @param node - The current FigmaNodeData to inspect.
 */
interface FrameInfo {
  id: string;
  name: string;
}

const findFramesInNode = (node: FigmaNodeData): FrameInfo[] => {
  const frames: FrameInfo[] = [];
  if (node.type === 'FRAME') {
    frames.push({
      id: node.id,
      name: node.name,
    });
    return frames;
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      // Continue searching in children if the current node is not a FRAME
      frames.push(...findFramesInNode(child));
    }
  }

  return frames;
};

/**
 * Fetch images for specific nodes from the Figma API
 * @param fileKey - Figma file key
 * @param nodeIds - Array of node IDs to render
 */
const fetchFigmaNodeImages = async (
  fileKey: string,
  nodeIds: string[]
): Promise<{ images: Record<string, string> }> => {
  const token = getValidToken();

  if (nodeIds.length === 0) {
    return { images: {} };
  }
  try {
    // Max 50 node IDs per request according to Figma API docs
    // We might need to chunk requests if nodeIds is very large
    const idsQueryParam = nodeIds.slice(0, 50).join(',');
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${idsQueryParam}&format=png&scale=0.4`;

    const response = await fetch(apiUrl, {
      headers: { 'X-Figma-Token': token },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Figma API image error: ${response.status} ${response.statusText} - ${errorData}`
      );
    }

    const result = await response.json();
    if (result.err) {
      throw new Error(`Figma API image error: ${result.err}`);
    }

    return result as { images: Record<string, string> };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Figma node images';
    throw new Error(errorMessage);
  }
};

/**================================================================================
 * Hooks
 *================================================================================*/
export function useFigmaUpload({ onSuccess, onError }: UseFigmaUploadOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Main method to process a Figma URL
   * @param figmaUrl - Figma URL to process
   */
  const processFigmaUrl = async (figmaUrl: string) => {
    try {
      // Check if token exists before proceeding
      if (!hasFigmaToken()) {
        const errorMessage = 'Figma API token is required';
        setError(errorMessage);
        onError?.(errorMessage);
        throw new Error(errorMessage);
      }

      setIsLoading(true);
      setError(null);

      // 1. Extract file key from URL
      const { fileKey, nodeId: selectedNode } = extractNodeFromFigmaUrl(figmaUrl);

      // 2. Fetch base data from Figma API to get structure
      const figmaData = await fetchFigmaNode(fileKey, selectedNode);
      if (!figmaData.document) return;

      // 3. Find frame nodes with their names
      const frames = findFramesInNode(figmaData.document);
      // Create a map of ID to name for later use
      const frameNameMap = new Map(frames.map((frame) => [frame.id, frame.name]));
      // Get just the IDs for the API call
      const frameIds = frames.map((frame) => frame.id);

      // 4. Fetch images for the identified nodes
      const imageResponse = await fetchFigmaNodeImages(fileKey, frameIds);
      const images = imageResponse.images;

      // Use the name from our map instead of just the ID
      const figmaImages = Object.entries(images).map(
        ([id, url]) =>
          ({
            id,
            type: 'file',
            filename: frameNameMap.get(id),
            mediaType: 'image/png',
            url,
            status: 'ready',
          }) satisfies FigmaImage
      );

      onSuccess?.(figmaImages);
      return figmaImages;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error processing Figma URL';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Error processing Figma URL:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    processFigmaUrl,
    isLoading: isLoading,
    error: error,
  };
}
