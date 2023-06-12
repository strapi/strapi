import React, { useEffect } from 'react';

import { LoadingIndicatorPage, useQueryParams, useStrapiApp } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import { MUTATE_EDIT_VIEW_LAYOUT } from '../../../exposedHooks';
import { useSyncRbac } from '../../hooks';

import { resetProps, setLayout } from './actions';
import Permissions from './Permissions';
import selectLayout from './selectors';

const EditViewLayoutManager = ({ layout, ...rest }) => {
  const currentLayout = useSelector(selectLayout);
  const dispatch = useDispatch();
  const [{ query }] = useQueryParams();
  const { runHookWaterfall } = useStrapiApp();
  const permissions = useSyncRbac(query, rest.slug, 'editView');

  useEffect(() => {
    // Allow the plugins to extend the edit view layout
    const mutatedLayout = runHookWaterfall(MUTATE_EDIT_VIEW_LAYOUT, { layout, query });

    dispatch(setLayout(mutatedLayout.layout, query));

    return () => {
      dispatch(resetProps());
    };
  }, [layout, dispatch, query, runHookWaterfall]);

  if (!currentLayout || !permissions) {
    return <LoadingIndicatorPage />;
  }

  return <Permissions {...rest} userPermissions={permissions} />;
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
