import PropTypes from 'prop-types';
import { getTrad } from './utils';

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

export const tableHeaders = [
  {
    name: 'preview',
    key: 'preview',
    metadatas: {
      label: { id: getTrad('list-table-header-preview'), defaultMessage: 'preview' },
      sortable: false,
    },
    type: 'image',
  },
  {
    name: 'name',
    key: 'name',
    metadatas: {
      label: { id: getTrad('list-table-header-name'), defaultMessage: 'name' },
      sortable: true,
    },
    type: 'text',
  },
  {
    name: 'ext',
    key: 'extension',
    metadatas: {
      label: { id: getTrad('list-table-header-ext'), defaultMessage: 'extension' },
      sortable: false,
    },
    type: 'ext',
  },
  {
    name: 'size',
    key: 'size',
    metadatas: {
      label: { id: getTrad('list-table-header-size'), defaultMessage: 'size' },
      sortable: false,
    },
    type: 'size',
  },
  {
    name: 'createdAt',
    key: 'createdAt',
    metadatas: {
      label: { id: getTrad('list-table-header-createdAt'), defaultMessage: 'created' },
      sortable: true,
    },
    type: 'date',
  },
  {
    name: 'updatedAt',
    key: 'updatedAt',
    metadatas: {
      label: { id: getTrad('list-table-header-updatedAt'), defaultMessage: 'last update' },
      sortable: true,
    },
    type: 'date',
  },
];

export const pageSizes = [10, 20, 50, 100];

export const sortOptions = [
  { key: 'sort.created_at_desc', value: 'createdAt:DESC' },
  { key: 'sort.created_at_asc', value: 'createdAt:ASC' },
  { key: 'sort.name_asc', value: 'name:ASC' },
  { key: 'sort.name_desc', value: 'name:DESC' },
  { key: 'sort.updated_at_desc', value: 'updatedAt:DESC' },
  { key: 'sort.updated_at_asc', value: 'updatedAt:ASC' },
];
