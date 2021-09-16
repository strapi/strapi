// mocking window.fetch since msw is not able to give back the res.url param

export const mockAssets = () => {
  window.fetch = url => {
    if (url === 'http://localhost:5000/an-image.png') {
      const headers = { get: () => 'image/png' };

      return Promise.resolve({ url: 'http://localhost:5000/an-image.png', headers });
    }

    if (url === 'http://localhost:5000/a-pdf.pdf') {
      const headers = { get: () => 'application/pdf' };

      return Promise.resolve({ url: 'http://localhost:5000/a-pdf.pdf', headers });
    }

    if (url === 'http://localhost:5000/a-video.mp4') {
      const headers = { get: () => 'video/mp4' };

      return Promise.resolve({ url: 'http://localhost:5000/a-video.mp4', headers });
    }

    // eslint-disable-next-line prefer-promise-reject-errors
    return Promise.reject('http://localhost:5000/not-working-like-cors.lutin');
  };
};
