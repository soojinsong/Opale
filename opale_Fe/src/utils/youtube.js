export const extractYoutubeVideoId = (url) => {
    if (!url || typeof url !== "string") return null;

    const regex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

    const match = url.match(regex);
    return match ? match[1] : null;
  };

  export const buildYoutubeEmbedUrl = (videoId) => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  };

  export const buildYoutubeThumbnailUrl = (videoId) => {
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };
