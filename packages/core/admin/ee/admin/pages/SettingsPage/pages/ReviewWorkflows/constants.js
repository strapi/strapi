import PropTypes from 'prop-types';

export const REDUX_NAMESPACE = 'settings_review-workflows';

export const ACTION_SET_WORKFLOWS = `Settings/Review_Workflows/SET_WORKFLOWS`;

export const StageType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
});
