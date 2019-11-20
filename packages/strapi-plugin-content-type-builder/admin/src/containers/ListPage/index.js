import React, { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { get } from 'lodash';
import { ViewContainer } from 'strapi-helper-plugin';
import useDataManager from '../../hooks/useDataManager';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
  const { pathname } = useLocation();
  const {
    initialData,
    modifiedData,
    isInContentTypeView,
    setModifiedData,
  } = useDataManager();
  const { push } = useHistory();
  const setModifiedDataRef = useRef();
  setModifiedDataRef.current = setModifiedData;

  useEffect(() => {
    setModifiedDataRef.current();
  }, [pathname]);

  const attributes = get(modifiedData, ['schema', 'attributes'], {});

  const handleClick = () => {
    const currentDataName = get(initialData, ['schema', 'name'], '');
    const forTarget = isInContentTypeView ? 'contentType' : 'component';
    const search = `modalType=chooseAttribute&forTarget=${forTarget}&targetr=${currentDataName}`;
    push({ search });
  };

  console.log({ allSchema: modifiedData });

  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <button type="button" onClick={handleClick}>
              Add field
            </button>
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
