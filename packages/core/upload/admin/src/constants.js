import PropTypes from 'prop-types';

export const AssetType = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
  Audio: 'audio',
};

export const AssetSource = {
  Url: 'url',
  Computer: 'computer',
};

export const FolderDefinition = PropTypes.shape({
  id: PropTypes.number.isRequired,
  children: PropTypes.shape({
    count: PropTypes.number.isRequired,
  }).isRequired,
  createdAt: PropTypes.string.isRequired,
  createdBy: PropTypes.shape(),
  files: PropTypes.shape({
    count: PropTypes.number.isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  parent: PropTypes.number,
  updatedAt: PropTypes.string.isRequired,
  updatedBy: PropTypes.shape(),
  pathId: PropTypes.number.isRequired,
  path: PropTypes.string.isRequired,
});

export const FolderParentDefinition = PropTypes.shape({
  id: PropTypes.number.isRequired,
  createdAt: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  pathId: PropTypes.number.isRequired,
  path: PropTypes.string.isRequired,
});

FolderParentDefinition.parent = FolderParentDefinition;

const FolderStructure = PropTypes.shape({
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string.isRequired,
  children: PropTypes.array,
});

FolderStructure.children = PropTypes.arrayOf(PropTypes.shape(FolderStructure));
FolderStructure.defaultProps = {
  children: undefined,
};

export const FolderStructureDefinition = PropTypes.arrayOf(FolderStructure);

export const AssetDefinition = PropTypes.shape({
  id: PropTypes.number,
  height: PropTypes.number,
  width: PropTypes.number,
  size: PropTypes.number,
  createdAt: PropTypes.string,
  ext: PropTypes.string,
  mime: PropTypes.string,
  name: PropTypes.string,
  url: PropTypes.string,
  updatedAt: PropTypes.string,
  alternativeText: PropTypes.string,
  caption: PropTypes.string,
  folder: PropTypes.shape(FolderDefinition),
  formats: PropTypes.shape({
    thumbnail: PropTypes.shape({
      url: PropTypes.string,
    }),
  }),
});
