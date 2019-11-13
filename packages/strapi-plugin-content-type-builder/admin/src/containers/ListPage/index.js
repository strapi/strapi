import React from 'react';

const ListPage = props => {
  console.log(props);
  React.useEffect(() => {
    console.log('moiutn');
  }, []);
  return <div>Coming soon</div>;
};

export default ListPage;
