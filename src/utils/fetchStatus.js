export const fetchStatus = (url) => {
  return fetch(url)
    .then((res) => {
      return {
        status: res.status,
        url: url,
      };
    })
    .catch((error) => {
      console.error("Error fetching status:", error);
      return {
        status: "Error",
        url: url,
      };
    });
};
