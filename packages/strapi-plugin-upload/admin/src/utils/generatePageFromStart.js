const generatePageFromStart = (start, limit) => {
  return Math.floor(start / limit) + 1;
};

export default generatePageFromStart;
