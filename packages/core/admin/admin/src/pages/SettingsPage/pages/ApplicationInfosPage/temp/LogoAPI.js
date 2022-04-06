// import CatLogo from './cat-logo.png';

// Temp class to mimic crud API
// to remove once back end routes are ready

class LogoAPI {
  constructor() {
    // this.projectSettings = {
    //   menuLogo: {
    //     url: CatLogo,
    //     name: 'cat-logo.png',
    //   }
    // };
    this.projectSettings = {
      menuLogo: null,
    };
  }

  getProjectSettings = () => {
    return this.projectSettings;
  };

  setProjectSettings = data => {
    console.log(data);
  };
}

export default LogoAPI;
