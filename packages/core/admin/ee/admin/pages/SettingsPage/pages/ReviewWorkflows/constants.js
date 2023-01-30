import PropTypes from 'prop-types';

export const REDUX_NAMESPACE = 'settings_review-workflows';

export const ACTION_SET_WORKFLOW = `Settings/Review_Workflows/SET_WORKFLOW`;

export const StageType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
});
