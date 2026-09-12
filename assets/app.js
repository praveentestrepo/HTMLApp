(function () {
  "use strict";

  var pageGrid = document.getElementById("page-grid");

  function renderPages(pages) {
    pageGrid.replaceChildren();
    pages.forEach(function (page) {
      var card = document.createElement("article");
      card.className = "page-card";
      card.innerHTML =
        "<span class=\"badge\">" + page.category + "</span>" +
        "<h2>" + page.title + "</h2>" +
        "<p>" + page.description + "</p>" +
        "<a href=\"" + page.url + "\">Open page &rarr;</a>";
      pageGrid.appendChild(card);
    });
  }

  fetch("pages.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Could not load pages.json.");
      }
      return response.json();
    })
    .then(renderPages)
    .catch(function () {
      pageGrid.innerHTML =
        "<div class=\"message\">Pages could not be loaded. Serve this folder through IIS or another web server.</div>";
    });
}());
