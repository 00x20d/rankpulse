(() => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageData") {
      sendResponse(data);
    } else if (request.action === "highlightLinks") {
      highlightLinks(request.linkType);
    } else if (request.action === "showSerpPreview") {
      chrome.runtime.sendMessage(
        {
          action: "fetchGoogleSearchResults",
          searchQuery: request.serpData.searchQuery,
        },
        (response) => {
          if (response && response.html) {
            parseAndShowSerpPreview(response.html, request.serpData);
          } else {
            console.error("Failed to fetch search results");
          }
        }
      );
    } else if (request.action === "updateSerpPreview") {
      if (iframe && iframe.contentDocument) {
        const searchPage = iframe.contentDocument.documentElement;
        if (searchPage) {
          updateSerpPreview(searchPage, request.serpData);
        }
      }
    }
  });
  const getMetaContent = (name) => {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.getAttribute("content") : "";
  };

  const getHeadings = () => {
    const headings = {};
    const h2h3Content = [];
    for (let i = 2; i <= 6; i++) {
      const count = document.querySelectorAll(`h${i}`).length;
      headings[`h${i}`] = count; // Always add the heading, even if count is 0
      if (i <= 3) {
        document.querySelectorAll(`h${i}`).forEach((h) => {
          h2h3Content.push({ type: `H${i}`, content: h.textContent.trim() });
        });
      }
    }
    return { headings, h2h3Content };
  };

  const getLinks = () => {
    const links = document.querySelectorAll("a");
    const currentDomain = window.location.hostname;
    let total = links.length;
    let internal = 0;
    let external = 0;
    let dofollow = 0;
    let nofollow = 0;
    let uniqueLinks = new Set();
    let internalLinks = [];
    let externalLinks = [];

    links.forEach((link) => {
      const href = link.href;
      const text = link.textContent.trim();
      uniqueLinks.add(href);
      if (href.includes(currentDomain)) {
        internal++;
        internalLinks.push({ href, text });
      } else if (href.startsWith("http") || href.startsWith("https")) {
        external++;
        externalLinks.push({ href, text });
      }
      if (link.rel.includes("nofollow")) {
        nofollow++;
      } else {
        dofollow++;
      }
    });

    return {
      total,
      internal,
      external,
      unique: uniqueLinks.size,
      dofollow,
      nofollow,
      internalLinks,
      externalLinks,
    };
  };

  const getWordCount = () => {
    const content = document.body.innerText;
    return content.trim().split(/\s+/).length;
  };

  const getPageContent = () => {
    return document.body.innerText;
  };

  const getImages = () => {
    const images = document.querySelectorAll("img");
    let total = images.length;
    let withAlt = 0;
    let withoutAlt = 0;
    let imagesList = [];

    images.forEach((img) => {
      const hasAlt = img.alt.trim() !== "";
      hasAlt ? withAlt++ : withoutAlt++;
      imagesList.push({
        alt: img.alt,
        src: img.src,
      });
    });

    return {
      total,
      withAlt,
      withoutAlt,
      imagesList,
    };
  };

  const data = {
    headline: document.title,
    description: getMetaContent("description"),
    url: window.location.href,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    headingsData: getHeadings(),
    linksData: getLinks(),
    wordCount: getWordCount(),
    pageContent: getPageContent(),
    imagesData: getImages(),
  };

  // highlight links
  function highlightLinks(linkType) {
    const links = document.querySelectorAll("a");
    const currentDomain = window.location.hostname;

    links.forEach((link) => {
      link.style.outline = "none";
      const isInternal = link.href.includes(currentDomain);
      const isDofollow = !link.rel.includes("nofollow");

      if (
        linkType === "all" ||
        (linkType === "internal" && isInternal) ||
        (linkType === "external" && !isInternal) ||
        (linkType === "dofollow" && isDofollow) ||
        (linkType === "nofollow" && !isDofollow)
      ) {
        link.style.outline = "2px solid red";
      }
    });
  }

  let iframe;
  let isPreviewOpen = false;

  function showSerpPreview(html) {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById("serp-preview-overlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "serp-preview-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: white;
      z-index: 9999;
      overflow-y: auto;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    `;

    // Create iframe to display the SERP
    iframe = document.createElement("iframe");
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    overlay.appendChild(iframe);

    // Append the overlay to the body
    document.body.appendChild(overlay);

    // Set the HTML content of the iframe
    iframe.srcdoc = html;

    // Position the iframe content after it has loaded
    iframe.onload = () => {
      const firstResult = iframe.contentDocument.querySelector(".g");
      if (firstResult) {
        const extraTopSpace = 100; // Adjust this value to add more space at the top
        const resultRect = firstResult.getBoundingClientRect();
        const scrollTop =
          resultRect.top + iframe.contentWindow.pageYOffset - extraTopSpace;
        iframe.contentWindow.scrollTo(0, scrollTop);
      }
    };

    // Add a close button
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close Preview";
    closeButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      padding: 5px 10px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `;
    closeButton.addEventListener("click", () => {
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        isPreviewOpen = false;
        document.body.style.overflow = "auto";
      }, 300);
    });
    overlay.appendChild(closeButton);

    // Trigger reflow and add opacity to create a fade-in effect
    setTimeout(() => {
      overlay.style.opacity = "1";
      isPreviewOpen = true;
      document.body.style.overflow = "hidden";
    }, 10);

    // Scroll to the first result after the iframe has loaded
    iframe.onload = () => {
      const firstResult = iframe.contentDocument.querySelector(".g");
      if (firstResult) {
        firstResult.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
  }

  function parseAndShowSerpPreview(html, serpData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract the entire search results page
    const searchPage = doc.documentElement;

    if (searchPage) {
      updateSerpPreview(searchPage, serpData);
      showSerpPreview(doc.documentElement.outerHTML);
    } else {
      console.error("Could not find search results in the parsed HTML");
    }
  }

  function extractTitleFromUrl(url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      if (parts.length > 2) {
        parts.shift(); // Remove subdomain if present
      }
      const mainPart = parts.slice(0, -1).join(" "); // Exclude the TLD
      const title = mainPart.replace(/-/g, " ");
      return title
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    } catch (error) {
      console.error("Error extracting title from URL:", error);
      return "";
    }
  }

  function updateSerpPreview(searchPage, serpData) {
    const firstResult = searchPage.querySelector(".g");
    if (firstResult) {
      const truncatedTitle = truncateText(serpData.title, 60, 524);
      const truncatedDescription = truncateText(serpData.description, 150);
      const truncatedUrl = truncateText(serpData.url, 50);
      const extractedTitle = extractTitleFromUrl(serpData.url);

      const containerElement = document.createElement("div");
      containerElement.style.cssText = `
        display: flex;
        flex-direction: column;
        margin-bottom: 10px;
      `;

      const topRowContainer = document.createElement("div");
      topRowContainer.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      `;

      const imageElement = document.createElement("img");
      imageElement.src = chrome.runtime.getURL("images/wordpress-logo.png");
      imageElement.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 10px;
      `;

      const topTextContainer = document.createElement("div");
      topTextContainer.style.cssText = `
        display: flex;
        flex-direction: column;
      `;

      const websiteNameElement = document.createElement("div");
      websiteNameElement.textContent = extractedTitle;
      websiteNameElement.style.cssText = `
        color: #006621;
        font-size: 14px;
        line-height: 1.3;
      `;

      const urlElement = document.createElement("div");
      urlElement.className = "TbwUpd";
      urlElement.innerHTML = `<cite class="iUh30 qLRx3b tjvcx" style="color: #006621; font-size: 12px;">${truncatedUrl}</cite>`;

      topTextContainer.appendChild(websiteNameElement);
      topTextContainer.appendChild(urlElement);
      topRowContainer.appendChild(imageElement);
      topRowContainer.appendChild(topTextContainer);

      const titleElement = document.createElement("h3");
      titleElement.className = "r";
      titleElement.innerHTML = `<a href="${serpData.url}" style="color: #1a0dab; font-size: 20px; line-height: 1.3;">${truncatedTitle}</a>`;

      const descriptionElement = document.createElement("div");
      descriptionElement.className = "aCOpRe";

      const currentDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      descriptionElement.innerHTML = `
        <div class="s">
          <div>
            <span style="color: #545454; font-size: 14px;">${currentDate} — </span>
            <span class="st" style="color: #545454; font-size: 14px;">${truncatedDescription}</span>
          </div>
        </div>
      `;

      containerElement.appendChild(topRowContainer);
      containerElement.appendChild(titleElement);
      containerElement.appendChild(descriptionElement);

      firstResult.innerHTML = "";
      firstResult.appendChild(containerElement);

      setTimeout(() => {
        firstResult.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  function truncateText(text, maxChars, maxPixels = Infinity) {
    if (text.length <= maxChars) {
      return text;
    }

    let truncated = text.substr(0, maxChars);

    if (maxPixels < Infinity) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = "20px Arial"; // Adjust this to match Google's font

      while (
        context.measureText(truncated + "...").width > maxPixels &&
        truncated.length > 0
      ) {
        truncated = truncated.substr(0, truncated.length - 1);
      }
    }

    return truncated + "...";
  }

  // Add this function at the end of your file
  function handleScroll(event) {
    if (isPreviewOpen) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // Add these event listeners at the end of your file
  window.addEventListener("scroll", handleScroll, { passive: false });
  window.addEventListener("mousewheel", handleScroll, { passive: false });
  window.addEventListener("touchmove", handleScroll, { passive: false });
})();
