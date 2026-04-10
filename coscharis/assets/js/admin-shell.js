/**
 * Admin shell: clone sidebar into mobile drawer, open/close, scroll lock, logout (.js-admin-logout).
 */
(function () {
  var ADMIN_KEY = "coscharis:admin:v1";

  function mountMobileNav() {
    var desk = document.getElementById("admin-sidebar-desktop");
    var scrollMount = document.getElementById("mobile-drawer-scroll");
    var footMount = document.getElementById("mobile-drawer-foot");
    if (!desk || !scrollMount || !footMount) return;
    var sc = desk.querySelector(".dash-sidebar-scroll") || desk.querySelector(".admin-sidebar-scroll");
    var ft = desk.querySelector(".dash-sidebar-foot") || desk.querySelector(".admin-sidebar-footer");
    if (sc && !scrollMount.children.length) scrollMount.appendChild(sc.cloneNode(true));
    if (ft && !footMount.children.length) footMount.appendChild(ft.cloneNode(true));
  }

  function initDrawer() {
    mountMobileNav();

    var drawerRoot = document.getElementById("mobile-drawer");
    var backdropEl = document.getElementById("mobile-drawer-backdrop");
    var burger = document.getElementById("admin-menu-toggle");
    var closeBtn = document.getElementById("mobile-drawer-close");
    var __lockY = 0;

    function isMobileDrawer() {
      return window.matchMedia("(max-width: 991px)").matches;
    }

    function lockScroll() {
      __lockY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = "-" + __lockY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }

    function unlockScroll() {
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, __lockY || 0);
    }

    function openDrawer() {
      if (!drawerRoot) return;
      drawerRoot.classList.add("is-open");
      drawerRoot.setAttribute("aria-hidden", "false");
      if (burger) burger.setAttribute("aria-expanded", "true");
      lockScroll();
    }

    function closeDrawer() {
      if (!drawerRoot) return;
      drawerRoot.classList.remove("is-open");
      drawerRoot.setAttribute("aria-hidden", "true");
      if (burger) burger.setAttribute("aria-expanded", "false");
      unlockScroll();
    }

    function toggleDrawer() {
      if (!drawerRoot) return;
      if (drawerRoot.classList.contains("is-open")) closeDrawer();
      else openDrawer();
    }

    if (burger) {
      burger.addEventListener("click", function () {
        if (!isMobileDrawer()) return;
        toggleDrawer();
      });
    }
    if (backdropEl) backdropEl.addEventListener("click", closeDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);

    if (drawerRoot) {
      drawerRoot.addEventListener(
        "click",
        function (ev) {
          if (!isMobileDrawer() || !drawerRoot.classList.contains("is-open")) return;
          var t = ev.target;
          while (t && t !== drawerRoot) {
            if (t.tagName === "A" && t.getAttribute("href")) {
              var href = t.getAttribute("href");
              if (href && href.charAt(0) !== "#") {
                if (t.getAttribute("target") === "_blank") {
                  setTimeout(closeDrawer, 0);
                  return;
                }
                ev.preventDefault();
                closeDrawer();
                window.location.href = t.href;
                return;
              }
              setTimeout(closeDrawer, 0);
              return;
            }
            t = t.parentNode;
          }
        },
        true
      );
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && drawerRoot && drawerRoot.classList.contains("is-open")) closeDrawer();
    });

    window.addEventListener("resize", function () {
      if (!isMobileDrawer() && drawerRoot && drawerRoot.classList.contains("is-open")) closeDrawer();
    });

    document.body.addEventListener("click", function (ev) {
      if (!ev.target.closest(".js-admin-logout")) return;
      try {
        localStorage.removeItem(ADMIN_KEY);
      } catch (e) {}
      window.location.href = "admin-login.html";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDrawer);
  } else {
    initDrawer();
  }
})();
