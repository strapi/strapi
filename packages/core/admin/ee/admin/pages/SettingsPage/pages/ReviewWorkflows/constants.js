import PropTypes from 'prop-types';

export const REDUX_NAMESPACE = 'settings_review-workflows';

export const ACTION_SET_LOADING_STATE = `Settings/Review_Workflows/SET_STATE`;
export const ACTION_SET_STAGES = `Settings/Review_Workflows/SET_DATA`;

export const StageType = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
});
