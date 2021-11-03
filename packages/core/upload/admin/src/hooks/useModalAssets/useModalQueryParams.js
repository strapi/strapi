import { useState } from 'react';

import { stringify } from 'qs';

const useModalQueryParams = () => {
  const [queryObject, setQueryObject] = useState({
    page: 1,
    sort: 'updatedAt:DESC',
    pageSize: 10,
  });

  const handleChangePageSize = pageSize => {
    setQueryObject(prev => ({ ...prev, pageSize: parseInt(pageSize, 10), page: 1 }));
  };

  const handeChangePage = page => {
    setQueryObject(prev => ({ ...prev, page }));
  };

  return [
    { queryObject, rawQuery: stringify(queryObject, { encode: false }) },
    { onChangePage: handeChangePage, onChangePageSize: handleChangePageSize },
  ];
};

export default useModalQueryParams;
