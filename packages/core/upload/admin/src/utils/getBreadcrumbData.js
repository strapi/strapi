import getFolderURL from './getFolderURL';

const getBreadcrumbData = (folder, { pathname, query }) => {
  let data = [
    {
      id: null,
      label: 'Media Library',
      href: folder ? getFolderURL(pathname, query) : undefined,
    },
  ];

  if (folder?.parent?.parent) {
    data.push([]);
  }

  if (folder?.parent) {
    data.push({
      id: folder.parent.id,
      label: folder.parent.name,
      href: getFolderURL(pathname, query, folder.parent),
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

export default getBreadcrumbData;
