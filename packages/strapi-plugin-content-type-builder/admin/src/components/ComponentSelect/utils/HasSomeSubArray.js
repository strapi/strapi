const hasSomeSubArray = (master, sub) => {
  return sub.some(v => master.indexOf(v) !== -1);
};

export default hasSomeSubArray;
