const getHeaderLabel = array => {
  let headerLabel = 'header.content.assets-single';

  if (array.length === 0) {
    headerLabel = 'header.content.assets-empty';
  } else if (array.length > 1) {
    headerLabel = 'header.content.assets-multiple';
  }

  return headerLabel;
};

export default getHeaderLabel;
