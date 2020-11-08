const formatVideosArray = array => {
  const alreadyFetchedVideos = JSON.parse(localStorage.getItem('videos')) || [];
  const didWatchVideos = alreadyFetchedVideos.length === array.length;
  let videos;

  if (!didWatchVideos) {
    videos = array.map(video => {
      return {
        ...video,
        duration: null,
        end: false,
        isOpen: false,
        key: video.order,
        startTime: 0,
      };
    });

    // Store the videos in the localStorage
    localStorage.setItem('videos', JSON.stringify(videos));
  } else {
    videos = alreadyFetchedVideos;
  }

  return { didWatchVideos, videos };
};

export default formatVideosArray;
