const getStep = type => {
  let step;

  if (type === 'float' || type === 'decimal') {
    step = 0.01;
  } else if (type === 'time' || type === 'datetime') {
    step = 30;
  } else {
    step = 1;
  }

  return step;
};

export default getStep;
