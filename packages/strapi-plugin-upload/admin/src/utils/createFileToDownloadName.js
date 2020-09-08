import { get } from 'lodash';

const createFileToDownloadName = ({ file, fileInfo: { name } }) => {
  const ext = get(file, 'ext', '');

  return `${name.replace(ext, '')}${ext}`;
};

export default createFileToDownloadName;
