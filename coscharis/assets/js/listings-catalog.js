/**
 * Public car listings (listing-grid / listing-list / listing-single).
 * Admin overrides: localStorage coscharis:listingsCatalog:v1
 */
(function () {
  "use strict";

  var STORAGE_KEY = "coscharis:listingsCatalog:v1";
  var DATA_URL = "coscharis/assets/data/listings-catalog.json";
  var META_ICONS = ["fa-steering-wheel", "fa-road", "fa-car", "fa-gas-pump"];

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function attrSrc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return Array.isArray(o) ? o : null;
    } catch (e) {
      return null;
    }
  }

  function fetchListings() {
    var stored = readStorage();
    if (stored) return Promise.resolve(stored);
    return fetch(DATA_URL, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load listings");
      return r.json();
    });
  }

  function persistListings(items) {
    if (!Array.isArray(items)) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }

  function clearOverride() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function hasOverride() {
    return readStorage() !== null;
  }

  function badgeHtml(badge) {
    if (badge === "used") return '<span class="car-status status-1">Used</span>';
    if (badge === "new") return '<span class="car-status status-2">New</span>';
    return "";
  }

  function metaLinesHtml(meta) {
    var lines = Array.isArray(meta) ? meta : [];
    var html = "";
    for (var i = 0; i < lines.length; i++) {
      var ic = META_ICONS[i % META_ICONS.length];
      html +=
        "<li><i class=\"far " +
        ic +
        '\"></i>' +
        escapeHtml(lines[i]) +
        "</li>";
    }
    return html;
  }

  function detailHref(id) {
    return "listing-single.html?id=" + encodeURIComponent(id);
  }

  function cardGrid(listing) {
    var href = detailHref(listing.id);
    return (
      '<div class="col-md-6 col-lg-4">' +
      '<div class="car-item">' +
      '<div class="car-img">' +
      badgeHtml(listing.badge) +
      '<img src="' +
      attrSrc(listing.image || "") +
      '" alt="">' +
      '<div class="car-btns">' +
      '<a href="#"><i class="far fa-heart"></i></a>' +
      '<a href="#"><i class="far fa-arrows-repeat"></i></a>' +
      "</div></div>" +
      '<div class="car-content">' +
      '<div class="car-top">' +
      "<h4><a href=\"" +
      href +
      '">' +
      escapeHtml(listing.title || "") +
      "</a></h4>" +
      '<div class="car-rate">' +
      '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>' +
      "<span>" +
      escapeHtml(listing.ratingLabel || "") +
      "</span></div></div>" +
      "<ul class=\"car-list\">" +
      metaLinesHtml(listing.meta) +
      "</ul>" +
      '<div class="car-footer">' +
      "<span class=\"car-price\">" +
      escapeHtml(listing.priceDisplay || "") +
      "</span>" +
      '<a href="' +
      href +
      '" class="theme-btn"><span class="far fa-eye"></span>Details</a>' +
      "</div></div></div></div>"
    );
  }

  function cardList(listing) {
    var href = detailHref(listing.id);
    var ex = listing.excerpt
      ? escapeHtml(listing.excerpt)
      : "There are many variations of passages available but the majority have suffered in some injected humour words slightly believable.";
    return (
      '<div class="col-md-6 col-lg-12">' +
      '<div class="car-item">' +
      '<div class="car-img">' +
      badgeHtml(listing.badge) +
      '<img src="' +
      attrSrc(listing.image || "") +
      '" alt="">' +
      '<div class="car-btns">' +
      '<a href="#"><i class="far fa-heart"></i></a>' +
      '<a href="#"><i class="far fa-arrows-repeat"></i></a>' +
      "</div></div>" +
      '<div class="car-content">' +
      '<div class="car-top">' +
      "<h4><a href=\"" +
      href +
      '">' +
      escapeHtml(listing.title || "") +
      "</a></h4>" +
      '<div class="car-rate">' +
      '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>' +
      "<span>" +
      escapeHtml(listing.ratingLabel || "") +
      "</span></div></div>" +
      "<ul class=\"car-list\">" +
      metaLinesHtml(listing.meta) +
      "</ul>" +
      "<p>" +
      ex +
      "</p>" +
      '<div class="car-footer">' +
      "<span class=\"car-price\">" +
      escapeHtml(listing.priceDisplay || "") +
      "</span>" +
      '<a href="' +
      href +
      '" class="theme-btn"><span class="far fa-eye"></span>Details</a>' +
      "</div></div></div></div>"
    );
  }

  function publishedOnly(list) {
    return (list || []).filter(function (l) {
      return l.published !== false;
    });
  }

  function renderGrid(root) {
    if (!root) return;
    fetchListings()
      .then(function (all) {
        var list = publishedOnly(all);
        root.innerHTML = "";
        for (var i = 0; i < list.length; i++) {
          root.insertAdjacentHTML("beforeend", cardGrid(list[i]));
        }
        var c = document.getElementById("coscharis-listings-count");
        if (c && list.length) {
          c.textContent = "Showing 1–" + list.length + " of " + list.length + " Results";
        } else if (c) {
          c.textContent = "No listings";
        }
      })
      .catch(function () {
        root.innerHTML =
          '<div class="col-12"><p class="text-danger">Could not load listings. Serve over http(s) or check listings-catalog.json.</p></div>';
      });
  }

  function renderList(root) {
    if (!root) return;
    fetchListings()
      .then(function (all) {
        var list = publishedOnly(all);
        root.innerHTML = "";
        for (var i = 0; i < list.length; i++) {
          root.insertAdjacentHTML("beforeend", cardList(list[i]));
        }
        var c = document.getElementById("coscharis-listings-count");
        if (c && list.length) {
          c.textContent = "Showing 1–" + list.length + " of " + list.length + " Results";
        } else if (c) {
          c.textContent = "No listings";
        }
      })
      .catch(function () {
        root.innerHTML =
          '<div class="col-12"><p class="text-danger">Could not load listings.</p></div>';
      });
  }

  function applySinglePage() {
    var id = null;
    try {
      id = new URL(window.location.href).searchParams.get("id");
    } catch (e) {}
    if (!id) return;

    fetchListings()
      .then(function (all) {
        var list = Array.isArray(all) ? all : [];
        var listing = list.find(function (x) {
          return x && x.id === id;
        });
        if (!listing) return;

        var t = document.getElementById("coscharis-listing-title");
        if (t) t.textContent = listing.title || "";

        var bc = document.querySelector(".breadcrumb-title");
        if (bc) bc.textContent = listing.title || "Listing";

        document.title = (listing.title || "Listing") + " — Coscharis";

        var badge = document.getElementById("coscharis-listing-badge");
        if (badge) {
          if (listing.badge === "used") {
            badge.className = "car-status status-1";
            badge.textContent = "Used";
            badge.style.display = "";
          } else if (listing.badge === "new") {
            badge.className = "car-status status-2";
            badge.textContent = "New";
            badge.style.display = "";
          } else {
            badge.style.display = "none";
          }
        }

        var img = document.getElementById("coscharis-listing-hero-img");
        if (img && listing.image) {
          img.src = listing.image;
          img.removeAttribute("data-thumb");
          var li = img.closest("li");
          if (li) li.setAttribute("data-thumb", listing.image);
        }

        var price = document.getElementById("coscharis-listing-sidebar-price");
        if (price) price.textContent = listing.priceDisplay || "";

        var rateLbl = document.getElementById("coscharis-listing-rating-label");
        if (rateLbl && listing.ratingLabel) rateLbl.textContent = listing.ratingLabel;

        var metaUl = document.getElementById("coscharis-listing-meta-lines");
        if (metaUl && listing.meta && listing.meta.length) {
          metaUl.innerHTML = metaLinesHtml(listing.meta);
        }
      })
      .catch(function () {});
  }

  window.CoscharisListings = {
    fetchListings: fetchListings,
    persistListings: persistListings,
    clearOverride: clearOverride,
    hasOverride: hasOverride,
    escapeHtml: escapeHtml,
    attrSrc: attrSrc
  };

  document.addEventListener("DOMContentLoaded", function () {
    var g = document.getElementById("coscharis-listings-grid-root");
    if (g) renderGrid(g);
    var lst = document.getElementById("coscharis-listings-list-root");
    if (lst) renderList(lst);
    if (document.getElementById("coscharis-listing-title")) applySinglePage();
  });
})();
