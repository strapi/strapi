const hasFindMethod = (handler: unknown) => {
  if (typeof handler === 'string') {
    return handler.split('.').pop() === 'find';
  }

  return false;
};

export { hasFindMethod };
