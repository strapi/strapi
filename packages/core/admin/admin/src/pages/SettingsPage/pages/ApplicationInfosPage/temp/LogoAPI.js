// import CatLogo from './cat-logo.png';

// Temp class to mimic crud API
// to remove once back end routes are ready

class LogoAPI {
  constructor() {
    // this.menuLogo = {
    //   url: CatLogo,
    //   name: 'cat-logo.png',
    // };
    this.menuLogo = null;
  }

  getLogo = () => {
    return this.menuLogo;
  };
}

export default LogoAPI;
