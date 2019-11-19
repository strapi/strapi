import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { get } from 'lodash';
import { ViewContainer } from 'strapi-helper-plugin';
import useDataManager from '../../hooks/useDataManager';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
  const { pathname } = useLocation();
  const { modifiedData, setModifiedData } = useDataManager();
  const setModifiedDataRef = useRef();
  setModifiedDataRef.current = setModifiedData;

  useEffect(() => {
    setModifiedDataRef.current();
  }, [pathname]);

  const attributes = get(modifiedData, ['schema', 'attributes'], {});
  console.log({ allSchema: modifiedData });
  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <ul>
              {Object.keys(attributes).map(attr => (
                <li key={attr}>{attr}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
};

export default ListPage;
