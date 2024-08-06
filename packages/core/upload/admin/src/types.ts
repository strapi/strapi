export interface ParentFolderInterface {
  id: number;
  createdAt: string;
  name: string;
  updatedAt: string;
  pathId: number;
  path: string;
  parent?: ParentFolderInterface;
}

export interface FolderInterface {
  id: number;
  children: {
    count: number;
  };
  createdAt: string;
  createdBy: string;
  files: {
    count: number;
  };
  name: string;
  updatedAt: string;
  updatedBy: string;
  pathId: number;
  path: string;
  parent?: ParentFolderInterface;
}

export interface AssetInterface {
  id: number;
  height: number;
  width: number;
  size: number;
  createdAt: string;
  ext: string;
  mime: string;
  name: string;
  url: string;
  updatedAt: string;
  alternativeText: string;
  caption: string;
  folder: FolderInterface;
  formats: {
    thumbnail: {
      url: string;
    };
  };
}

export interface RawFile extends Blob {
  size: number;
  lastModified: number;
  name: string;
  type: string;
}
