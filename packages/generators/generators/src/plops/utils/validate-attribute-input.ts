export default (input: string) => {
  const regex = /^[A-Za-z-|_]+$/g;

  if (!input) {
    return 'You must provide an input';
  }

  return regex.test(input) || "Please use only letters, '-', '_',  and no spaces";
};
