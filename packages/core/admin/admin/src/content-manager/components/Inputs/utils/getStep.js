const getStep = type => {
  let step;

  if (type === 'float' || type === 'decimal') {
    step = 0.01;
  } else if (type === 'time' || type === 'datetime') {
    // Since we cannot set a value that is not in the list of the time picker, we need to set the step to 1
    // TODO: Fix the timepicker in order to be able to set any value regardless of the list
    step = 1;
  } else {
    step = 1;
  }

  return step;
};

export default getStep;
