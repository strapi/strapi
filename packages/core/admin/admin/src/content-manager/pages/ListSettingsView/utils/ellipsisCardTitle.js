const ellipsisCardTitle = (title) => {
  const formattedTitle = title.length > 20 ? `${title.substring(0, 20)}...` : title;

  return formattedTitle;
};

export default ellipsisCardTitle;
