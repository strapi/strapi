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
