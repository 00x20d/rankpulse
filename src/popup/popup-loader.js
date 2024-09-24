document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/popup/popup.js");
  script.type = "module";
  document.head.appendChild(script);
});
