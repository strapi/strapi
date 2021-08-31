import { get } from 'lodash';

const createFileToDownloadName = ({ file, fileInfo: { name } }) => {
  const ext = get(file, 'ext', '');

  return name.endsWith(ext) ? name : `${name}${ext}`;
};

export default createFileToDownloadName;
