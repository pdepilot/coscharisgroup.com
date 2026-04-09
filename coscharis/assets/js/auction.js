/**
 * Coscharis Live Auctions — frontend mock layer
 * Replace fetch/placeBid with real API calls when backend is ready.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "coscharis:auction:mock:v1";
  var USER_BIDS_KEY = "coscharis:auction:userBids:v1";
  var LOTS_URL = "coscharis/assets/data/auction-lots.json";

  function formatNaira(n) {
    var num = Number(n);
    if (isNaN(num)) return "—";
    return "₦" + num.toLocaleString("en-NG");
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadUserBidsMap() {
    try {
      var raw = localStorage.getItem(USER_BIDS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveUserBidsMap(map) {
    try {
      localStorage.setItem(USER_BIDS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function recordUserBid(email, entry) {
    if (!email || !entry) return;
    var e = String(email).toLowerCase().trim();
    var map = loadUserBidsMap();
    if (!map[e]) map[e] = [];
    map[e].unshift(entry);
    saveUserBidsMap(map);
    try {
      window.dispatchEvent(new CustomEvent("coscharis-user-bids-updated"));
    } catch (err) {}
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function renderProfileBidsTable() {
    var tbody = document.getElementById("coscharis-profile-bids-tbody");
    var emptyEl = document.getElementById("coscharis-profile-bids-empty");
    if (!tbody) return;

    if (!window.CoscharisAuth || !CoscharisAuth.isLoggedIn || !CoscharisAuth.isLoggedIn()) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-muted">Sign in to see your bids.</td></tr>';
      return;
    }

    var sess = CoscharisAuth.getSession();
    var email = sess && sess.email ? String(sess.email).toLowerCase().trim() : "";
    var list = (loadUserBidsMap()[email] || []).slice(0);

    if (!list.length) {
      tbody.innerHTML = "";
      if (emptyEl) emptyEl.classList.remove("d-none");
      return;
    }

    if (emptyEl) emptyEl.classList.add("d-none");
    tbody.innerHTML = "";
    list.forEach(function (b) {
      var tr = document.createElement("tr");
      var lotHref =
        "auction-lot.html?id=" + encodeURIComponent(b.lotId || "");
      tr.innerHTML =
        "<td>" +
        escapeHtml(b.lotNo || b.lotId || "—") +
        "</td><td>" +
        escapeHtml(b.lotTitle || "—") +
        "</td><td>" +
        escapeHtml(formatNaira(b.amount)) +
        "</td><td>" +
        escapeHtml(new Date(b.at).toLocaleString()) +
        '</td><td><a class="theme-btn theme-btn2 btn-sm" href="' +
        lotHref +
        '">View lot</a></td>';
      tbody.appendChild(tr);
    });
  }

  function getLotState(lotId, baseLot) {
    var st = loadState();
    var s = st[lotId];
    if (!s) {
      return {
        currentBid: baseLot.currentBid,
        bids: (baseLot.seedBids || []).slice(0)
      };
    }
    return {
      currentBid: s.currentBid != null ? s.currentBid : baseLot.currentBid,
      bids: Array.isArray(s.bids) ? s.bids : (baseLot.seedBids || []).slice(0)
    };
  }

  function setLotState(lotId, currentBid, bids) {
    var st = loadState();
    st[lotId] = { currentBid: currentBid, bids: bids };
    saveState(st);
  }

  function fetchLots() {
    return fetch(LOTS_URL, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load auction lots");
      return r.json();
    });
  }

  function mergeLot(base) {
    var ls = getLotState(base.id, base);
    return {
      id: base.id,
      carId: base.carId,
      title: base.title,
      image: base.image,
      lotNo: base.lotNo,
      location: base.location,
      minIncrement: base.minIncrement,
      endsAt: base.endsAt,
      status: base.status,
      currentBid: ls.currentBid,
      bids: ls.bids.slice(0).sort(function (a, b) {
        return new Date(b.at) - new Date(a.at);
      })
    };
  }

  /**
   * @returns {{ ok: boolean, message?: string, lot?: object }}
   */
  function placeBid(lotBase, amount, bidderLabel) {
    if (!lotBase || lotBase.status !== "live") {
      return { ok: false, message: "This lot is not open for bidding." };
    }
    var end = new Date(lotBase.endsAt).getTime();
    if (Date.now() >= end) {
      return { ok: false, message: "This auction has ended." };
    }

    var amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return { ok: false, message: "Enter a valid bid amount." };
    }

    var merged = mergeLot(lotBase);
    var minNext = merged.currentBid + lotBase.minIncrement;
    if (amt < minNext) {
      return {
        ok: false,
        message: "Minimum bid is " + formatNaira(minNext) + " (current + increment)."
      };
    }

    var entry = {
      amount: amt,
      bidder: bidderLabel || "You",
      at: new Date().toISOString()
    };
    var bids = [entry].concat(merged.bids);
    setLotState(lotBase.id, amt, bids);

    return { ok: true, lot: mergeLot(lotBase) };
  }

  function formatCountdown(endsAt, el) {
    if (!el) return;
    function tick() {
      var end = new Date(endsAt).getTime();
      var now = Date.now();
      var ms = end - now;
      if (ms <= 0) {
        el.textContent = "Ended";
        return;
      }
      var s = Math.floor(ms / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      var sec = s % 60;
      el.textContent = d + "d " + h + "h " + m + "m " + sec + "s";
    }
    tick();
    return setInterval(tick, 1000);
  }

  function renderListing(root) {
    if (!root) return;
    fetchLots()
      .then(function (lots) {
        root.innerHTML = "";
        lots.forEach(function (base) {
          var lot = mergeLot(base);
          if (lot.status !== "live") return;

          var col = document.createElement("div");
          col.className = "col-md-6 col-lg-4 mb-4";
          col.innerHTML =
            '<div class="car-item auction-lot-card" style="border-radius:14px;overflow:hidden;box-shadow:var(--box-shadow);height:100%">' +
            '<div class="car-img" style="position:relative">' +
            '<span class="car-status status-1" style="position:absolute;left:10px;top:10px;z-index:1">Live</span>' +
            '<img src="' +
            lot.image +
            '" alt="" style="width:100%;height:200px;object-fit:cover">' +
            "</div>" +
            '<div class="car-content p-3">' +
            '<div class="d-flex justify-content-between align-items-start mb-2">' +
            '<span class="badge" style="background:rgba(60,62,144,.1);color:var(--brand-secondary);border:1px solid rgba(60,62,144,.2)">' +
            lot.lotNo +
            "</span>" +
            '<small class="auction-countdown text-muted" data-ends="' +
            lot.endsAt +
            '"></small>' +
            "</div>" +
            "<h4 class=\"mb-2\" style=\"font-size:18px\"><a class=\"coscharis-auction-lot-link\" href=\"auction-lot.html?id=" +
            encodeURIComponent(lot.id) +
            '">' +
            lot.title +
            "</a></h4>" +
            '<p class="mb-1 small text-muted"><i class="far fa-location-dot"></i> ' +
            (base.location || "") +
            "</p>" +
            '<p class="mb-1"><strong>Current bid:</strong> <span style="color:var(--theme-color)">' +
            formatNaira(lot.currentBid) +
            "</span></p>" +
            '<p class="mb-3 small">Min. next bid: ' +
            formatNaira(lot.currentBid + base.minIncrement) +
            "</p>" +
            '<a href="auction-lot.html?id=' +
            encodeURIComponent(lot.id) +
            '" class="theme-btn w-100 text-center d-block coscharis-auction-lot-link"><span class="far fa-gavel"></span> View &amp; Bid</a>' +
            "</div></div>";

          root.appendChild(col);
          var cd = col.querySelector(".auction-countdown");
          if (cd) formatCountdown(lot.endsAt, cd);
        });
      })
      .catch(function () {
        root.innerHTML =
          '<div class="col-12"><p class="text-danger">Could not load auctions. Serve the site over http(s) or check that auction-lots.json exists.</p></div>';
      });
  }

  function getQueryId() {
    try {
      var u = new URL(window.location.href);
      return u.searchParams.get("id");
    } catch (e) {
      return null;
    }
  }

  function renderLotPage() {
    var id = getQueryId();
    if (!id) {
      document.getElementById("auction-lot-root") &&
        (document.getElementById("auction-lot-root").innerHTML =
          '<p class="text-danger">Missing lot id. <a href="auction.html">Back to auctions</a></p>');
      return;
    }

    fetchLots().then(function (lots) {
      var base = lots.find(function (l) {
        return l.id === id;
      });
      if (!base) {
        document.getElementById("lot-title").textContent = "Lot not found";
        return;
      }

      var lot = mergeLot(base);
      var titleEl = document.getElementById("lot-title");
      var breadcrumbEl = document.getElementById("lot-breadcrumb");
      if (titleEl) titleEl.textContent = lot.title;
      if (breadcrumbEl) breadcrumbEl.textContent = lot.title;
      document.title = lot.title + " — Coscharis Auction";

      var retail = document.getElementById("lot-view-retail");
      if (retail && base.carId) {
        retail.href = "inventory-single.html?id=" + encodeURIComponent(base.carId);
      }

      var img = document.getElementById("lot-main-image");
      if (img) {
        img.src = lot.image;
        img.alt = lot.title;
      }

      document.getElementById("lot-lot-no") &&
        (document.getElementById("lot-lot-no").textContent = lot.lotNo);
      document.getElementById("lot-location") &&
        (document.getElementById("lot-location").textContent = base.location || "—");

      var cb = document.getElementById("lot-current-bid");
      if (cb) cb.textContent = formatNaira(lot.currentBid);

      var mn = document.getElementById("lot-min-next");
      if (mn) mn.textContent = formatNaira(lot.currentBid + base.minIncrement);

      var inc = document.getElementById("lot-increment");
      if (inc) inc.textContent = formatNaira(base.minIncrement);

      var bidInput = document.getElementById("bid-amount");
      if (bidInput) {
        bidInput.min = String(lot.currentBid + base.minIncrement);
        bidInput.placeholder = String(lot.currentBid + base.minIncrement);
        bidInput.value = "";
      }

      var nameInput = document.getElementById("bidder-name");
      if (
        nameInput &&
        window.CoscharisAuth &&
        CoscharisAuth.isLoggedIn &&
        CoscharisAuth.isLoggedIn()
      ) {
        var sess = CoscharisAuth.getSession();
        if (sess && sess.name) nameInput.value = sess.name;
        else if (sess && sess.email) nameInput.value = sess.email.split("@")[0];
      }

      var cdEl = document.getElementById("lot-countdown");
      if (cdEl) formatCountdown(lot.endsAt, cdEl);

      function refreshHistory() {
        var merged = mergeLot(base);
        var tbody = document.getElementById("lot-history-body");
        if (!tbody) return;
        tbody.innerHTML = "";
        merged.bids.forEach(function (b) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            formatNaira(b.amount) +
            "</td><td>" +
            (b.bidder || "—") +
            "</td><td>" +
            new Date(b.at).toLocaleString() +
            "</td>";
          tbody.appendChild(tr);
        });
      }
      refreshHistory();

      var form = document.getElementById("place-bid-form");
      if (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          if (!window.CoscharisAuth || !CoscharisAuth.isLoggedIn()) {
            var lotId = getQueryId();
            var next =
              "auction-lot.html" +
              (lotId ? "?id=" + encodeURIComponent(lotId) : "");
            window.location.href =
              "login.html?next=" + encodeURIComponent(next);
            return;
          }
          var amt = bidInput ? bidInput.value : "";
          var name =
            (document.getElementById("bidder-name") || {}).value || "You";
          var result = placeBid(base, amt, name.trim() || "You");
          var msg = document.getElementById("bid-message");
          if (!result.ok) {
            if (msg) {
              msg.className = "small text-danger mt-2";
              msg.textContent = result.message;
            }
            return;
          }

          if (
            window.CoscharisAuth &&
            CoscharisAuth.isLoggedIn &&
            CoscharisAuth.isLoggedIn()
          ) {
            var sess = CoscharisAuth.getSession();
            if (sess && sess.email) {
              recordUserBid(sess.email, {
                lotId: base.id,
                lotTitle: lot.title,
                lotNo: base.lotNo,
                amount: Number(amt),
                at: new Date().toISOString()
              });
            }
          }

          if (cb) cb.textContent = formatNaira(result.lot.currentBid);
          if (mn) mn.textContent = formatNaira(result.lot.currentBid + base.minIncrement);
          if (bidInput) {
            bidInput.min = String(result.lot.currentBid + base.minIncrement);
            bidInput.value = "";
            bidInput.placeholder = String(result.lot.currentBid + base.minIncrement);
          }
          if (msg) {
            msg.className = "small text-success mt-2";
            msg.textContent = "Bid placed successfully (demo — connect API for production).";
          }
          refreshHistory();
          var modal = document.getElementById("bidModal");
          if (modal && typeof bootstrap !== "undefined") {
            var inst = bootstrap.Modal.getInstance(modal);
            if (inst) inst.hide();
          }
        };
      }
    });
  }

  window.CoscharisAuction = {
    formatNaira: formatNaira,
    fetchLots: fetchLots,
    mergeLot: mergeLot,
    placeBid: placeBid,
    renderListing: renderListing,
    renderLotPage: renderLotPage,
    renderProfileBidsTable: renderProfileBidsTable,
    loadUserBidsMap: loadUserBidsMap
  };

  document.addEventListener("DOMContentLoaded", function () {
    var listRoot = document.getElementById("auction-lots-root");
    if (listRoot) renderListing(listRoot);

    if (document.body.classList.contains("page-auction-lot")) {
      renderLotPage();
    }

    if (document.getElementById("coscharis-profile-bids-tbody")) {
      renderProfileBidsTable();
    }
  });

  window.addEventListener("coscharis-user-bids-updated", function () {
    if (document.getElementById("coscharis-profile-bids-tbody")) {
      renderProfileBidsTable();
    }
  });
})();
