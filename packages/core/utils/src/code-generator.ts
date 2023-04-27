// Using timestamp (milliseconds) to be sure it is unique
// + converting timestamp to base 36 for better readibility
const generateTimestampCode = (date: Date) => {
  const referDate = date || new Date();

  return referDate.getTime().toString(36);
};

export { generateTimestampCode };
