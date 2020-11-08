const hasSubArray = (master, sub) => {
  return sub.every(v => master.indexOf(v) !== -1);
};

export default hasSubArray;
