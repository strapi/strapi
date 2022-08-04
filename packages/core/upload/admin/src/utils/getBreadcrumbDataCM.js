import getTrad from './getTrad';

const getBreadcrumbDataML = folder => {
  let data = [
    {
      id: null,
      label: { id: getTrad('plugin.name'), defaultMessage: 'MediaLibrary' },
    },
  ];

  if (folder?.parent?.parent) {
    data.push([]);
  }

  if (folder?.parent) {
    data.push({
      id: folder.parent.id,
      label: folder.parent.name,
    });
  }

  if (folder) {
    data.push({
      id: folder.id,
      label: folder.name,
    });
  }

  return data;
};

export default getBreadcrumbDataML;
