import { memo, useCallback, useRef } from 'react';
import {
  useTracking,
  useNotification,
  useAPIErrorHandler,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { getTrad } from '../../utils';
import { setStatus } from '../../sharedReducers/crudReducer/actions';
import selectCrudReducer from '../../sharedReducers/crudReducer/selectors';
import { getRequestUrl } from './utils';

// This container is used to handle the CRUD
const SingleTypeFormWrapper = ({ children, slug }) => {
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const toggleNotification = useNotification();
  const dispatch = useDispatch();
  const { formatAPIError } = useAPIErrorHandler(getTrad);
  const fetchClient = useFetchClient();

  const { componentsDataStructure, contentTypeDataStructure, data, status } =
    useSelector(selectCrudReducer);

  const displayErrors = useCallback(
    (err) => {
      toggleNotification({ type: 'warning', message: formatAPIError(err) });
    },
    [toggleNotification, formatAPIError]
  );

  const onDraftRelationCheck = useCallback(async () => {
    try {
      trackUsageRef.current('willCheckDraftRelations');

      const endPoint = getRequestUrl(`${slug}/actions/numberOfDraftRelations`);
      dispatch(setStatus('draft-relation-check-pending'));

      const numberOfDraftRelations = await fetchClient.get(endPoint);
      trackUsageRef.current('didCheckDraftRelations');

      dispatch(setStatus('resolved'));

      return numberOfDraftRelations.data.data;
    } catch (err) {
      displayErrors(err);
      dispatch(setStatus('resolved'));

      return Promise.reject(err);
    }
  }, [fetchClient, displayErrors, slug, dispatch]);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    onDraftRelationCheck,
    redirectionLink: '/',
    status,
  });
};

SingleTypeFormWrapper.propTypes = {
  children: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default memo(SingleTypeFormWrapper);
