import PropTypes from 'prop-types';

const themeShape = {
  theme: PropTypes.shape({
    main: PropTypes.shape({
      colors: PropTypes.object,
      fontSizes: PropTypes.object,
      fontWeights: PropTypes.object,
      sizes: PropTypes.object,
    }),
  }),
};

export default themeShape;
