const getSSOProvidersList = async () => {
	const { providerRegistry } = strapi.admin.services.passport;

	return providerRegistry.getAll().map(({ uid }) => uid);
}

export default {
	getSSOProvidersList,
};

  