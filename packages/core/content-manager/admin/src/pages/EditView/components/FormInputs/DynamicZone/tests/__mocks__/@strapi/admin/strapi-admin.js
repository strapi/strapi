const actual = jest.requireActual('@strapi/admin/strapi-admin');

const useStrapiApp = jest.fn((name, getter) => {
  const realAppState = {
    ...(actual.useStrapiApp(name, (state) => state) || {}),
  };

  if (name === 'useInjectionZone') {
    realAppState.getPlugin = jest.fn(() => ({
      getInjectedComponents: jest.fn(() => [
        {
          name: 'mocked',
          Component: () => '<div>Mocked Injected Component</div>',
        },
      ]),
    }));
  }

  return getter(realAppState);
});

module.exports = {
  ...actual,
  useStrapiApp,
};
