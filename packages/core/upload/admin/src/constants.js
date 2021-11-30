import PropTypes from 'prop-types';

export const AssetType = {
  Video: 'video',
  Image: 'image',
  Document: 'doc',
};

export const AssetSource = {
  Url: 'url',
  Computer: 'computer',
};

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
  formats: PropTypes.shape({
    thumbnail: PropTypes.shape({
      url: PropTypes.string,
    }),
  }),
});
