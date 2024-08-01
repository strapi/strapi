// TODO: replace with the constants file when it will be migrated to TS
export enum AssetType {
  Video = 'video',
  Image = 'image',
  Document = 'doc',
  Audio = 'audio',
}

export enum AssetSource {
  Url = 'url',
  Computer = 'computer',
}

export const sortOptions = [
  { key: 'sort.created_at_desc', value: 'createdAt:DESC' },
  { key: 'sort.created_at_asc', value: 'createdAt:ASC' },
  { key: 'sort.name_asc', value: 'name:ASC' },
  { key: 'sort.name_desc', value: 'name:DESC' },
  { key: 'sort.updated_at_desc', value: 'updatedAt:DESC' },
  { key: 'sort.updated_at_asc', value: 'updatedAt:ASC' },
];
