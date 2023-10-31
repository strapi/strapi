export const getBasename = () => (process.env.ADMIN_PATH ?? '').replace(window.location.origin, '');
