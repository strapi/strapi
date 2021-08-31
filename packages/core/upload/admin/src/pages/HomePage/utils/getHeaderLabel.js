const getHeaderLabel = count => {
  let headerLabel = 'header.content.assets-single';

  if (count === 0) {
    headerLabel = 'header.content.assets-empty';
  } else if (count > 1) {
    headerLabel = 'header.content.assets-multiple';
  }

  return headerLabel;
};

export default getHeaderLabel;
