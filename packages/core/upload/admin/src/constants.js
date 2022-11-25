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

const ParentFolderShape = {
  id: PropTypes.number.isRequired,
  createdAt: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  pathId: PropTypes.number.isRequired,
  path: PropTypes.string.isRequired,
};

ParentFolderShape.parent = PropTypes.shape(ParentFolderShape);

const FolderShape = {
  id: PropTypes.number.isRequired,
  children: PropTypes.shape({
    count: PropTypes.number.isRequired,
  }),
  createdAt: PropTypes.string.isRequired,
  createdBy: PropTypes.shape(),
  files: PropTypes.shape({
    count: PropTypes.number.isRequired,
  }),
  name: PropTypes.string.isRequired,
  updatedAt: PropTypes.string.isRequired,
  updatedBy: PropTypes.shape(),
  pathId: PropTypes.number.isRequired,
  path: PropTypes.string.isRequired,
};

FolderShape.parent = PropTypes.shape(ParentFolderShape);

export const FolderDefinition = PropTypes.shape(FolderShape);

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

export const CrumbDefinition = PropTypes.shape({
  id: PropTypes.number,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }),
  ]).isRequired,
  href: PropTypes.string,
});

export const CrumbMenuDefinition = PropTypes.arrayOf(CrumbDefinition);

export const BreadcrumbsDefinition = PropTypes.arrayOf(
  PropTypes.oneOfType([CrumbDefinition, CrumbMenuDefinition])
);
