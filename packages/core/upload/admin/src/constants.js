export const AssetType = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Unknown: 'unknown', // useful when CORS prevents from getting the mime type of an asset
};

export const AssetSource = {
  Url: 'url',
  Computer: 'computer',
};
