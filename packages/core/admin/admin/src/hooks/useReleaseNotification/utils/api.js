import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;
const fetchStrapiLatestRelease = async () => {
  try {
    const { tag_name } = await fetch('https://api.github.com/repos/strapi/strapi/releases/latest').then(res => res.json());
    
    return tag_name;

  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

export default fetchStrapiLatestRelease;
