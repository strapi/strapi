import React from 'react';
import { ViewContainer } from 'strapi-helper-plugin';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
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
