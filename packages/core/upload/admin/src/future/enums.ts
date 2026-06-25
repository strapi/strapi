export const AssetType = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Audio: 'audio',
} as const satisfies Record<string, AssetType>;

export type AssetType = 'video' | 'image' | 'doc' | 'audio';
