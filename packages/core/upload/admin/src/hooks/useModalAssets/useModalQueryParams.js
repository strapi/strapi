import { useState } from 'react';

import { stringify } from 'qs';

const useModalQueryParams = () => {
  const [queryObject, setQueryObject] = useState({
    page: 1,
    updatedAt: 'DESC',
    pageSize: 10,
  });

  const handleChangePageSize = nextPage => {
    setQueryObject(prev => ({ ...prev, pageSize: parseInt(nextPage, 10), page: 1 }));
  };

  return [
    { queryObject, rawQuery: stringify(queryObject, { encode: false }) },
    { onChangePageSize: handleChangePageSize },
  ];
};

export default useModalQueryParams;
