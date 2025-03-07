export type Project = {
  id: string;
  name: string;
  timestamp: string;
  type: 'code';
  files: {
    path: string;
    content: string;
  }[];
};
