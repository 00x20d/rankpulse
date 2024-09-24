// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("SEO Checker Extension Installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectContentScript") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ["src/content/content.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error injecting content script:",
                chrome.runtime.lastError.message
              );
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              sendResponse({ success: true });
            }
          }
        );
        return true; // Indicates that the response is sent asynchronously
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchGoogleSearchResults") {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      request.searchQuery
    )}`;
    console.log("Fetching URL:", searchUrl);

    fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        // Send the raw HTML back to the content script
        sendResponse({ html: html });
      })
      .catch((error) => {
        console.error("Error fetching Google search results:", error);
        sendResponse({ error: error.message });
      });

    return true; // Indicates that the response is sent asynchronously
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 400,
    height: 600,
  });
});
