import CatLogo from './cat-logo.png';

// Temp class to mimic crud API
// to remove once back routes are ready

class LogoAPI {
  constructor() {
    this.menuLogo = {
      url: CatLogo,
      name: 'cat-logo.png',
    };
  }

  getLogo = () => {
    return this.menuLogo;
  };
}

export default LogoAPI;
