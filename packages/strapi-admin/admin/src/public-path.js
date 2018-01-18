// Retrieve remote and backend URLs.
const remoteURL = (() => {
  if (window.location.port === '4000') {
    return 'http://localhost:4000/admin';
  }

  // Relative URL (ex: /dashboard)
  if (process.env.REMOTE_URL[0] === '/') {
    return (window.location.origin + process.env.REMOTE_URL).replace(/\/$/, '');
  }

  return process.env.REMOTE_URL.replace(/\/$/, '');
})();
const backendURL = (process.env.BACKEND_URL === '/' ? window.location.origin : process.env.BACKEND_URL);

// Retrieve development URL to avoid to re-build.
const $body = document.getElementsByTagName('body')[0];
const devFrontURL = $body.getAttribute('front') ? window.location.origin + $body.getAttribute('front').replace(/\/$/, '') : null;
const devBackendURL = $body.getAttribute('back') ? window.location.origin + $body.getAttribute('back').replace(/\/$/, '') : null;

$body.removeAttribute('front');
$body.removeAttribute('back');

window.strapi = {
  remoteURL: devFrontURL || remoteURL,
  backendURL: devBackendURL || backendURL,
};

__webpack_public_path__ = window.location.port === '4000' ? `${window.location.origin}/` : `${(strapi.remoteURL).replace(window.location.origin, '')}/`;
