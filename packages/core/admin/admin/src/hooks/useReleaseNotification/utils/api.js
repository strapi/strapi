import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;
const fetchStrapiLatestRelease = async () => {
  try {
    const res = await fetch('https://api.github.com/repos/strapi/strapi/releases/latest');
    const { tag_name } = await res.json();
    
    return tag_name;

  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

export default fetchStrapiLatestRelease;
