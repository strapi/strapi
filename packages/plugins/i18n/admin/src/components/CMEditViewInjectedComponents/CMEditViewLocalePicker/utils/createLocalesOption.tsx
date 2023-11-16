/* eslint-disable check-file/filename-naming-convention */
const createLocalesOption = (
  localesToDisplay: Array<{
    name: string;
    code: string;
  }>,
  localesFromData: Array<{
    locale: string;
    publishedAt: string | null;
    id: number;
  }>
) => {
  return localesToDisplay.map(({ name, code }) => {
    const matchingLocaleInData = localesFromData.find(({ locale }) => locale === code);

    let status = 'did-not-create-locale';

    if (matchingLocaleInData) {
      status = matchingLocaleInData.publishedAt === null ? 'draft' : 'published';
    }

    return {
      id: matchingLocaleInData ? matchingLocaleInData.id : null,
      label: name,
      value: code,
      status,
    };
  });
};

export default createLocalesOption;
