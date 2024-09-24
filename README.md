## SEO Checker Extension Documentation

This extension provides tools to help digital marketers, SEO professionals, and webmasters check and analyze SEO metrics while previewing Search Engine Results Pages (SERPs).

### Features:

* **SEO Checker:** Analyze key SEO metrics like title, description, word count, canonical URL, headings, and Web Vitals.
* **Status:** Check the HTTP status code and URL of the current page.
* **Links:** View a summary of internal, external, and unique links, as well as the ability to highlight specific link types on the page.
* **Headings:**  Analyze the frequency of headings (H2-H6) and view a list of all H2 and H3 headings on the page.
* **Images:** Analyze the presence of alt text on images and view a list of all images on the page.
* **SERP Preview:** Preview how a page might appear in Google search results, with options to modify the title, description, URL, and date.

### Usage:

1. **Install the Extension:**  Add the SEO Checker extension to your Chrome browser.
2. **Open a Page:** Navigate to the website or webpage you want to analyze.
3. **Access the Popup:** Click on the extension's icon in the browser toolbar to open the SEO Checker popup.
4. **Explore the Tabs:**  Use the tabs to switch between different features and analyses.

### Code Structure:

The extension's code is structured as follows:

* **manifest.json:**  Defines the extension's properties and configuration.
* **background/background.js:**  Handles communication between the extension and the content script.
* **content/content.js:**  Injected into the web pages you visit to gather SEO data.
* **popup/popup.html:**  The popup interface for the extension.
* **popup/popup.js:**  JavaScript code responsible for the popup's functionality.
* **popup/styles.css:**  Styling for the popup.
* **popup/web-vitals-wrapper.js:**  Wrapper for Web Vitals API.
* **popup/web-vitals.js:**  Implementation of the Web Vitals API.
* **utils/fetchStatus.js:**  Utility function for retrieving HTTP status codes.

### Contributing:

Contributions to this extension are welcome!  If you find any issues or have ideas for improvements, please submit a pull request or create an issue on the project's GitHub repository.