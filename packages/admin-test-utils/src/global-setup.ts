const globalSetup = async () => {
  process.env.TZ = 'UTC';
  process.env.LANG = 'en_US.UTF-8';
  process.env.ADMIN_PATH = '/admin/';
};

export default globalSetup;
