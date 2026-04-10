/**
 * Shared shop catalog (localStorage). Managed from admin-shop.html; consumed on shop.html / shop-single.html.
 */
(function (global) {
  "use strict";

  var CATALOG_KEY = "coscharis:shopCatalog:v1";

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function parsePrice(s) {
    if (!s) return 0;
    var cleaned = String(s).replace(/[^\d]/g, "");
    if (!cleaned) return 0;
    return parseInt(cleaned, 10) || 0;
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildSeedItems() {
    return [
      { id: "coscharis-shop-seed-01", title: "Car Engine Parts", price: "₦624,000", oldPrice: "₦720,000", tag: "Sale", image: "coscharis/assets/img/shop/01.jpg" },
      { id: "coscharis-shop-seed-02", title: "Car Engine Parts", price: "₦1,024,000", image: "coscharis/assets/img/shop/02.jpg" },
      { id: "coscharis-shop-seed-03", title: "Car Engine Parts", price: "₦1,136,000", image: "coscharis/assets/img/shop/03.jpg" },
      { id: "coscharis-shop-seed-04", title: "Car Engine Parts", price: "₦464,000", oldPrice: "₦512,000", tag: "Sale", image: "coscharis/assets/img/shop/04.jpg" },
      { id: "coscharis-shop-seed-05", title: "Car Engine Parts", price: "₦1,072,000", image: "coscharis/assets/img/shop/05.jpg" },
      { id: "coscharis-shop-seed-06", title: "Car Engine Parts", price: "₦400,000", image: "coscharis/assets/img/shop/06.jpg" },
      { id: "coscharis-shop-seed-07", title: "Car Engine Parts", price: "₦672,000", image: "coscharis/assets/img/shop/07.jpg" },
      { id: "coscharis-shop-seed-08", title: "Car Engine Parts", price: "₦880,000", image: "coscharis/assets/img/shop/08.jpg" },
      { id: "coscharis-shop-seed-09", title: "Car Engine Parts", price: "₦1,112,000", image: "coscharis/assets/img/shop/09.jpg" }
    ];
  }

  function loadCatalog() {
    var raw = localStorage.getItem(CATALOG_KEY);
    var parsed = raw ? safeParse(raw) : null;
    if (parsed && Array.isArray(parsed.items) && parsed.items.length) return parsed;
    var data = { items: buildSeedItems() };
    saveCatalog(data);
    return data;
  }

  function saveCatalog(data) {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(data));
    try {
      window.dispatchEvent(new CustomEvent("coscharis-shop-catalog-updated"));
    } catch (e) {}
  }

  function newProductId() {
    return "coscharis-shop-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  }

  function getById(id) {
    if (!id) return null;
    var items = loadCatalog().items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function sortItems(items, sort) {
    var list = items.slice();
    if (sort === "priceAsc") {
      list.sort(function (a, b) {
        return parsePrice(a.price) - parsePrice(b.price);
      });
    } else if (sort === "priceDesc") {
      list.sort(function (a, b) {
        return parsePrice(b.price) - parsePrice(a.price);
      });
    } else if (sort === "titleAsc") {
      list.sort(function (a, b) {
        return String(a.title || "").localeCompare(String(b.title || ""));
      });
    } else if (sort === "latest") {
      list.reverse();
    }
    return list;
  }

  function renderShopGrid(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var sortEl = document.getElementById("coscharis-shop-sort");
    var sort = sortEl ? sortEl.value : "default";
    var items = sortItems(loadCatalog().items, sort);

    var html = "";
    for (var i = 0; i < items.length; i++) {
      var p = items[i];
      var sale = p.tag ? '<span class="shop-item-sale">' + escapeHtml(p.tag) + "</span>" : "";
      var priceBlock = p.oldPrice
        ? '<div class="shop-item-price"><del>' +
          escapeHtml(p.oldPrice) +
          "</del> " +
          escapeHtml(p.price) +
          "</div>"
        : '<div class="shop-item-price">' + escapeHtml(p.price) + "</div>";
      var singleUrl = "shop-single.html?id=" + encodeURIComponent(p.id);
      html +=
        '<div class="col-md-6 col-lg-4">' +
        '<div class="shop-item" data-cart-id="' +
        escapeAttr(p.id) +
        '">' +
        '<div class="shop-item-img">' +
        sale +
        '<img src="' +
        escapeAttr(p.image) +
        '" alt="' +
        escapeAttr(p.title) +
        '">' +
        '<div class="shop-item-meta">' +
        '<a href="#" role="button" aria-label="Favorite"><i class="far fa-heart"></i></a>' +
        '<a href="' +
        singleUrl +
        '" aria-label="View product"><i class="far fa-eye"></i></a>' +
        '<a href="#" role="button" aria-label="Add to cart"><i class="far fa-shopping-cart"></i></a>' +
        "</div></div>" +
        '<div class="shop-item-info">' +
        '<div class="shop-item-rate">' +
        '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>' +
        "</div>" +
        '<a href="' +
        singleUrl +
        '"><h4 class="shop-item-title">' +
        escapeHtml(p.title) +
        "</h4></a>" +
        priceBlock +
        "</div></div></div>";
    }

    el.innerHTML = html;

    var countEl = document.getElementById("coscharis-shop-result-count");
    if (countEl) {
      var n = items.length;
      countEl.textContent = n ? "Showing 1–" + n + " of " + n + " Results" : "No products";
    }
  }

  function renderRelated(containerId, excludeId, limit) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var lim = limit || 4;
    var items = loadCatalog().items.filter(function (p) {
      return p.id !== excludeId;
    });
    var out = [];
    for (var i = 0; i < items.length && out.length < lim; i++) out.push(items[i]);

    var html = "";
    for (var j = 0; j < out.length; j++) {
      var p = out[j];
      var sale = p.tag ? '<span class="shop-item-sale">' + escapeHtml(p.tag) + "</span>" : "";
      var priceBlock = p.oldPrice
        ? '<div class="shop-item-price"><del>' +
          escapeHtml(p.oldPrice) +
          "</del> " +
          escapeHtml(p.price) +
          "</div>"
        : '<div class="shop-item-price">' + escapeHtml(p.price) + "</div>";
      var singleUrl = "shop-single.html?id=" + encodeURIComponent(p.id);
      html +=
        '<div class="col-md-6 col-lg-3">' +
        '<div class="shop-item" data-cart-id="' +
        escapeAttr(p.id) +
        '">' +
        '<div class="shop-item-img">' +
        sale +
        '<img src="' +
        escapeAttr(p.image) +
        '" alt="">' +
        '<div class="shop-item-meta">' +
        '<a href="#"><i class="far fa-heart"></i></a>' +
        '<a href="' +
        singleUrl +
        '"><i class="far fa-eye"></i></a>' +
        '<a href="#"><i class="far fa-shopping-cart"></i></a>' +
        "</div></div>" +
        '<div class="shop-item-info">' +
        '<div class="shop-item-rate">' +
        '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>' +
        "</div>" +
        '<a href="' +
        singleUrl +
        '"><h4 class="shop-item-title">' +
        escapeHtml(p.title) +
        "</h4></a>" +
        priceBlock +
        "</div></div></div>";
    }
    el.innerHTML = html;
  }

  function applySinglePage() {
    var params = new URLSearchParams(window.location.search || "");
    var id = params.get("id");
    var p = getById(id) || loadCatalog().items[0];
    if (!p) return;

    var titleEl = document.querySelector(".single-item-title");
    if (titleEl) titleEl.textContent = p.title || "Product";

    var priceWrap = document.querySelector(".single-item-price h4");
    if (priceWrap) {
      if (p.oldPrice) {
        priceWrap.innerHTML =
          "<del>" + escapeHtml(p.oldPrice) + "</del><span>" + escapeHtml(p.price) + "</span>";
      } else {
        priceWrap.innerHTML = "<span>" + escapeHtml(p.price) + "</span>";
      }
    }

    var descEl = document.getElementById("coscharis-single-desc");
    if (descEl) {
      descEl.textContent =
        p.description ||
        "Quality automotive parts sourced for Coscharis. Replace this text from Admin → Shop.";
    }

    var skuEl = document.getElementById("coscharis-single-sku");
    if (skuEl) skuEl.textContent = p.sku || String(p.id).slice(-10).toUpperCase();

    var catEl = document.getElementById("coscharis-single-category");
    if (catEl) catEl.textContent = p.category || "Car Parts";

    var imgEl = document.getElementById("coscharis-single-main-img");
    if (imgEl) {
      imgEl.src = p.image || "";
      imgEl.alt = p.title || "";
    }

    var info = document.querySelector(".single-item-info");
    if (info) info.setAttribute("data-cart-id", p.id);

    document.title = (p.title || "Shop") + " — Coscharis";
  }

  global.CoscharisShopCatalog = {
    CATALOG_KEY: CATALOG_KEY,
    buildSeedItems: buildSeedItems,
    loadCatalog: loadCatalog,
    saveCatalog: saveCatalog,
    newProductId: newProductId,
    getById: getById,
    parsePrice: parsePrice,
    sortItems: sortItems,
    renderShopGrid: renderShopGrid,
    renderRelated: renderRelated,
    applySinglePage: applySinglePage
  };
})(window);
