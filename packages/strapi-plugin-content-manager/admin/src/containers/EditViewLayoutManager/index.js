import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import EditView from '../EditView';
import { resetProps, setLayout } from './actions';
import selectLayout from './selectors';

const EditViewLayoutManager = ({ layout, ...rest }) => {
  const currentLayout = useSelector(selectLayout);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(setLayout(layout));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch]);

  if (!currentLayout) {
    return <LoadingIndicatorPage />;
  }

  return <EditView {...rest} layout={currentLayout} />;
};

EditViewLayoutManager.propTypes = {
  layout: PropTypes.shape({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      uid: PropTypes.string.isRequired,
      settings: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      options: PropTypes.object.isRequired,
      attributes: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};

export default EditViewLayoutManager;
