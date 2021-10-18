const ellipsisCardTitle = title => {
  const formatedTitle = title.length > 20 ? `${title.substring(0, 20)}...` : title;

  return formatedTitle;
};

export default ellipsisCardTitle;
