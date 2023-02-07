import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useFetchClient } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { produce } from 'immer';

import { useInjectReducer } from '../../../../admin/src/hooks/useInjectReducer';

const NS = 'StrapiAdmin/ee_license-info';
const ACTION_EE_LICENSE_INFO_SET_DATA = 'StrapiAdmin/EE_LICENSE_INFO_GET_DATA';

const initalState = {
  serverState: {
    currentUserCount: null,
    permittedSeats: null,
    shouldNotify: false,
    licenseLimitStatus: null,
    isHostedOnStrapiCloud: false,
    licenseType: null,
  },
};

const reducer = (state = initalState, action) =>
  /* eslint-disable-next-line consistent-return */
  produce(state, (draft) => {
    switch (action.type) {
      case ACTION_EE_LICENSE_INFO_SET_DATA: {
        draft.serverState = action.payload;
        break;
      }

      default:
        return draft;
    }
  });

const actionSetData = (payload) => {
  return {
    type: ACTION_EE_LICENSE_INFO_SET_DATA,
    payload,
  };
};

const useLicenseLimitInfos = () => {
  const instance = useFetchClient();
  const fetchLicenseLimitInfo = async () => {
    const {
      data: { data },
    } = await instance.get('/admin/license-limit-information');

    return data;
  };

  const { data, status } = useQuery('license-limit-info', fetchLicenseLimitInfo);

  const state = useSelector((state) => state?.[NS] ?? initalState);
  const dispatch = useDispatch();

  useInjectReducer(NS, reducer);

  useEffect(() => {
    if (status === 'success' && data) {
      dispatch(actionSetData(data));
    }
  }, [data, status, dispatch]);

  return state.serverState;
};

export default useLicenseLimitInfos;
