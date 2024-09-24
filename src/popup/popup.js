import { fetchStatus } from "../utils/fetchStatus.js";

export function initializePopup() {
  function updateTitleLabel() {
    const titleInput = document.getElementById("serpTitle");
    const length = titleInput.value.length;
    const pxWidth = measureTextWidth(titleInput.value, "20px Arial");
    document.getElementById("serpTitleChars").textContent = length;
    document.getElementById("serpTitlePx").textContent = Math.round(pxWidth);
  }

  function updateDescriptionLabel() {
    const descriptionInput = document.getElementById("serpDescription");
    const descriptionChars = document.getElementById("serpDescriptionChars");
    if (descriptionInput && descriptionChars) {
      const length = descriptionInput.value.length;
      descriptionChars.textContent = length;
    } else {
      console.error("Description input or chars element not found");
    }
  }

  function measureTextWidth(text, font) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
  }

  function setupSerpPreview(serpData) {
    console.log("setupSerpPreview function called");
    console.log("SERP Data:", serpData);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: "showSerpPreview",
            serpData: serpData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error sending message:",
                chrome.runtime.lastError.message
              );
              // Attempt to inject the content script and retry
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
                  } else {
                    // Retry sending the message after a short delay
                    setTimeout(() => {
                      chrome.tabs.sendMessage(
                        tabs[0].id,
                        {
                          action: "showSerpPreview",
                          serpData: serpData,
                        },
                        (retryResponse) => {
                          if (chrome.runtime.lastError) {
                            console.error(
                              "Error on retry:",
                              chrome.runtime.lastError.message
                            );
                          } else {
                            console.log(
                              "Message sent successfully on retry, response:",
                              retryResponse
                            );
                          }
                        }
                      );
                    }, 100);
                  }
                }
              );
            } else {
              console.log("Message sent successfully, response:", response);
            }
          }
        );
      } else {
        console.error("No active tab found");
      }
    });

    // Set up real-time update listeners
    const titleInput = document.getElementById("serpTitle");
    const descriptionInput = document.getElementById("serpDescription");
    const urlInput = document.getElementById("serpUrl");

    [titleInput, descriptionInput, urlInput].forEach((input) => {
      input.addEventListener("input", () => {
        const updatedSerpData = {
          ...serpData,
          title: titleInput.value,
          description: descriptionInput.value,
          url: urlInput.value,
        };
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateSerpPreview",
            serpData: updatedSerpData,
          });
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const titleInput = document.getElementById("serpTitle");
    const descriptionInput = document.getElementById("serpDescription");
    const previewButton = document.getElementById("previewSerp");
    const urlInput = document.getElementById("serpUrl");

    if (titleInput) {
      titleInput.addEventListener("input", updateTitleLabel);
    } else {
      console.error("Title input element not found");
    }

    if (descriptionInput) {
      descriptionInput.addEventListener("input", updateDescriptionLabel);
    } else {
      console.error("Description input element not found");
    }

    if (previewButton) {
      previewButton.addEventListener("click", () => {
        const searchQuery = document.getElementById("searchQuery").value;
        const title = titleInput.value;
        const description = descriptionInput.value;
        const url = urlInput.value;

        const serpData = {
          searchQuery,
          title,
          description,
          url,
        };

        setupSerpPreview(serpData);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "showSerpPreview",
            serpData: serpData,
          });
        });
      });
    }

    // Set initial URL to current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      urlInput.value = tabs[0].url;
      urlInput.placeholder = tabs[0].url;
    });

    // Initialize labels
    updateTitleLabel();
    updateDescriptionLabel();

    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        tabs.forEach((t) => t.classList.remove("active"));
        tabContents.forEach((tc) => tc.classList.remove("active"));

        tab.classList.add("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
      });
    });

    // Fetch data from the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ["src/content/content.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getPageData" },
            (response) => {
              if (response) {
                const headlineChars =
                  document.getElementById("seoHeadlineChars");
                const headlineContent =
                  document.getElementById("seoHeadlineContent");
                const descriptionChars = document.getElementById(
                  "seoDescriptionChars"
                );
                const descriptionContent = document.getElementById(
                  "seoDescriptionContent"
                );
                const urlContent = document.getElementById("urlContent");
                const canonicalContent =
                  document.getElementById("canonicalContent");

                if (headlineChars)
                  headlineChars.textContent = `Characters: ${response.headline.length}`;
                if (headlineContent)
                  headlineContent.textContent = response.headline;
                if (descriptionChars)
                  descriptionChars.textContent = `Characters: ${response.description.length}`;
                if (descriptionContent)
                  descriptionContent.textContent = response.description;
                if (urlContent) urlContent.textContent = response.url;
                if (canonicalContent)
                  canonicalContent.textContent = response.canonical;

                // Fetch status code
                fetchStatus(response.url).then((res) => {
                  const statusDot = document.getElementById("statusDot");
                  const statusCode = document.getElementById("statusCode");
                  const statusUrl = document.getElementById("statusUrl");

                  if (res.status === 200) {
                    if (statusDot) statusDot.style.backgroundColor = "green";
                    if (statusCode) {
                      statusCode.textContent = "Status: 200";
                      statusCode.style.backgroundColor = "green";
                      statusCode.style.color = "white";
                      statusCode.style.fontWeight = "bold";
                    }
                  } else {
                    if (statusDot) statusDot.style.backgroundColor = "red";
                    if (statusCode) {
                      statusCode.textContent = `Status: ${res.status}`;
                      statusCode.style.backgroundColor = "red";
                      statusCode.style.color = "white";
                      statusCode.style.fontWeight = "bold";
                    }
                  }
                  if (statusUrl) statusUrl.textContent = res.url;
                });

                // Populate Headings tab
                const headingsSummary =
                  document.getElementById("headingsSummary");
                const h2h3List = document.getElementById("h2h3List");
                const exportButton = document.getElementById("exportHeadings");

                // Populate headings summary
                let summaryHTML = '<div class="headings-grid">';
                for (let i = 2; i <= 6; i++) {
                  const type = `h${i}`;
                  const count = response.headingsData.headings[type] || 0;
                  summaryHTML += `
                  <div class="heading-column">
                    <div class="heading-type">${type.toUpperCase()}</div>
                    <div class="heading-count">${count}</div>
                  </div>`;
                }
                summaryHTML += "</div>";
                headingsSummary.innerHTML = summaryHTML;

                // Populate H2 and H3 list
                let listHTML = "";
                response.headingsData.h2h3Content.forEach((h) => {
                  listHTML += `<div class="heading-item"><span class="heading-type">&lt;${h.type}&gt;</span><span class="heading-content">${h.content}</span></div>`;
                });
                h2h3List.innerHTML = listHTML;

                // Export functionality
                exportButton.addEventListener("click", () => {
                  let csv = "Type,Content\n";
                  response.headingsData.h2h3Content.forEach((h) => {
                    csv += `"${h.type}","${h.content.replace(/"/g, '""')}"\n`;
                  });
                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.setAttribute("download", "headings.csv");
                  link.click();
                  URL.revokeObjectURL(url);
                });

                // Populate links summary
                const linksSummary = document.getElementById("linksSummary");

                let linksSummaryHTML = '<div class="links-grid">';
                const linkTypes = [
                  { key: "total", label: "TOTAL" },
                  { key: "internal", label: "INTERNAL" },
                  { key: "external", label: "EXTERNAL" },
                  { key: "unique", label: "UNIQUE" },
                ];
                linkTypes.forEach((type) => {
                  linksSummaryHTML += `
                  <div class="link-column">
                    <div class="link-type">${type.label}</div>
                    <div class="link-count">${
                      response.linksData[type.key]
                    }</div>
                  </div>`;
                });
                linksSummaryHTML += "</div>";
                linksSummary.innerHTML = linksSummaryHTML;

                const highlightButton =
                  document.getElementById("highlightLinks");
                if (highlightButton) {
                  highlightButton.addEventListener("click", () => {
                    const selectedLinkType = document.querySelector(
                      'input[name="linkType"]:checked'
                    ).value;
                    if (selectedLinkType) {
                      chrome.tabs.sendMessage(tabs[0].id, {
                        action: "highlightLinks",
                        linkType: selectedLinkType,
                      });
                    }
                  });
                }

                setupLinkToggles(response);
                setupImagesTab(response);

                // Display word count
                document.getElementById("wordCount").textContent =
                  response.wordCount;

                const exportWordsButton =
                  document.getElementById("exportPageContent");
                exportWordsButton.addEventListener("click", () => {
                  const blob = new Blob([response.pageContent], {
                    type: "text/plain",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "page_content.txt";
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }
            }
          );
        }
      );
    });

    function measureWebVitals() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ["src/popup/web-vitals.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error injecting web-vitals.js:",
                chrome.runtime.lastError.message
              );
              return;
            }

            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: () => {
                webVitals.onLCP((metric) => {
                  chrome.runtime.sendMessage({
                    action: "updateWebVital",
                    metric: "LCP",
                    value: metric.value,
                  });
                });

                webVitals.onINP((metric) => {
                  chrome.runtime.sendMessage({
                    action: "updateWebVital",
                    metric: "INP",
                    value: metric.value,
                  });
                });

                webVitals.onCLS((metric) => {
                  chrome.runtime.sendMessage({
                    action: "updateWebVital",
                    metric: "CLS",
                    value: metric.value,
                  });
                });
              },
            });
          }
        );
      });
    }

    // Add this function to format and display the Web Vitals
    function displayWebVital(metric, value) {
      const elementId = `${metric.toLowerCase()}Value`;
      const element = document.getElementById(elementId);
      if (element) {
        let formattedValue;
        switch (metric) {
          case "LCP":
            formattedValue = (value / 1000).toFixed(2) + " s";
          case "INP":
            formattedValue = value.toFixed(2) + " ms";
            break;
          case "CLS":
            formattedValue = value.toFixed(2);
            break;
        }
        element.textContent = formattedValue;
      }
    }

    // Update the message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "updateWebVital") {
        displayWebVital(message.metric, message.value);
      }
    });

    // Call measureWebVitals after fetching other data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          files: ["src/content/content.js"],
        },
        () => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "getPageData" },
            (response) => {
              if (response) {
                // ... (rest of the code to populate other fields)

                // Measure Web Vitals after populating other fields
                console.log("Calling measureWebVitals");
                measureWebVitals();
              } else {
                console.error("No response from content script");
              }
            }
          );
        }
      );
    });
  });

  function setupLinkToggles(response) {
    const toggleButtons = document.querySelectorAll(".toggle-button");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const targetContent = document.getElementById(targetId);
        if (targetContent.style.display === "block") {
          targetContent.style.display = "none";
        } else {
          targetContent.style.display = "block";
          if (targetContent.querySelector(".link-list").children.length === 0) {
            populateLinkList(targetId, response.linksData[`${targetId}`]);
          }
        }
      });
    });
  }

  function populateLinkList(targetId, links) {
    const linkList = document.querySelector(`#${targetId} .link-list`);
    const fragment = document.createDocumentFragment();
    links.forEach((link) => {
      const li = document.createElement("li");

      const anchor = document.createElement("div");
      anchor.className = "link-anchor";
      anchor.textContent = "ANCHOR\nLINK";

      const details = document.createElement("div");
      details.className = "link-details";

      const page = document.createElement("div");
      page.className = "link-page";
      page.textContent = link.text || "Unnamed Link";

      const url = document.createElement("a");
      url.className = "link-url";
      url.href = link.href;
      url.textContent = link.href;
      url.target = "_blank";
      url.rel = "noopener noreferrer";

      details.appendChild(page);
      details.appendChild(url);

      li.appendChild(anchor);
      li.appendChild(details);

      fragment.appendChild(li);
    });
    linkList.innerHTML = "";
    linkList.appendChild(fragment);
  }

  function setupImagesTab(response) {
    const imagesSummary = document.getElementById("imagesSummary");
    const imagesList = document.getElementById("imagesList");

    // Populate images summary
    let summaryHTML = '<div class="images-grid">';
    const imageTypes = [
      { key: "total", label: "TOTAL" },
      { key: "withAlt", label: "WITH ALT" },
      { key: "withoutAlt", label: "WITHOUT ALT" },
    ];
    imageTypes.forEach((type) => {
      summaryHTML += `
      <div class="image-column">
        <div class="image-type">${type.label}</div>
        <div class="image-count">${response.imagesData[type.key]}</div>
      </div>`;
    });
    summaryHTML += "</div>";
    imagesSummary.innerHTML = summaryHTML;

    // Populate images list
    let listHTML = "";
    response.imagesData.imagesList.forEach((img) => {
      listHTML += `
      <div class="image-item">
        <div class="image-labels">
          <div class="image-label">ALT</div>
          <div class="image-label">LINK</div>
        </div>
        <div class="image-details">
          <div class="image-alt">${img.alt || "No alt text"}</div>
          <a href="${
            img.src
          }" target="_blank" rel="noopener noreferrer" class="image-link">${
        img.src
      }</a>
        </div>
      </div>`;
    });
    imagesList.innerHTML = listHTML;
  }
}

initializePopup();

// chrome.action.onClicked.addListener((tab) => {
//   chrome.windows.create({
//     url: "popup.html",
//     type: "popup",
//     width: 400,
//     height: 600,
//   });
// });
