const createScheduleService = (strapi) => {
  const state = [];

  return {
    add(date) {
      state.push(date);
    },
    getAll() {
      return state;
    },
  };
};

export default createScheduleService;
