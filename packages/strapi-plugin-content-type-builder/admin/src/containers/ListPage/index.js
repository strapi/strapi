import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewContainer } from 'strapi-helper-plugin';
import useDataManager from '../../hooks/useDataManager';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
  const { pathname } = useLocation();
  const { setModifiedData } = useDataManager();
  const setModifiedDataRef = useRef();
  setModifiedDataRef.current = setModifiedData;

  useEffect(() => {
    setModifiedDataRef.current();
  }, [pathname]);

  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">List here</div>
        </div>
      </div>
    </ViewContainer>
  );
};

export default ListPage;
