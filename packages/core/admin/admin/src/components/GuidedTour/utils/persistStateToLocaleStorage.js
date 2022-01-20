export const CURRENT_STEP = 'GUIDED_TOUR_CURRENT_STEP';
export const COMPLETED_STEPS = 'GUIDED_TOUR_COMPLETED_STEPS';
const parse = JSON.parse;
const stringify = JSON.stringify;

const persistStateToLocaleStorage = {
  clear() {
    localStorage.removeItem(CURRENT_STEP);
    localStorage.removeItem(COMPLETED_STEPS);
  },
  addCompletedStep: completedStep => {
    const currentSteps = parse(localStorage.getItem(COMPLETED_STEPS))?.slice() || [];
    const isAlreadyStored = currentSteps.includes(completedStep);

    if (isAlreadyStored) {
      return;
    }

    currentSteps.push(completedStep);
    localStorage.setItem(COMPLETED_STEPS, stringify(currentSteps));
  },
  addCurrentStep: currentStep => {
    console.log('yopo');
    localStorage.setItem(CURRENT_STEP, stringify(currentStep));
  },
  get: item => {
    return JSON.parse(localStorage.getItem(item));
  },
};

export default persistStateToLocaleStorage;
