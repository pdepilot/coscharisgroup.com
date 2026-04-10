(function($) {
    "use strict";

    // Auth: register/login (local demo) + checkout requires login
    (function() {
        var AUTH_KEY = "coscharis:auth:v1";
        var USERS_KEY = "coscharis:users:v1";

        function safeParse(json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        }

        function getSession() {
            return safeParse(localStorage.getItem(AUTH_KEY));
        }

        function isLoggedIn() {
            var s = getSession();
            return !!(s && s.loggedIn && s.email);
        }

        function setSession(user) {
            localStorage.setItem(
                AUTH_KEY,
                JSON.stringify({
                    email: user.email,
                    name: user.name || "",
                    loggedIn: true
                })
            );
        }

        function logout() {
            localStorage.removeItem(AUTH_KEY);
        }

        function loadUsers() {
            var u = safeParse(localStorage.getItem(USERS_KEY));
            return Array.isArray(u) ? u : [];
        }

        function saveUsers(users) {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }

        function findUser(email) {
            if (!email) return null;
            var e = String(email).toLowerCase().trim();
            var users = loadUsers();
            for (var i = 0; i < users.length; i++) {
                if (users[i].email && String(users[i].email).toLowerCase().trim() === e) {
                    return users[i];
                }
            }
            return null;
        }

        function safeNext(param) {
            if (!param) return null;
            try {
                var d = decodeURIComponent(param);
                if (!d || d.indexOf("://") !== -1 || d.indexOf("/") !== -1 || d.indexOf("..") !== -1) {
                    return null;
                }
                var q = d.indexOf("?");
                var base = q === -1 ? d : d.substring(0, q);
                if (!/^[a-z0-9_.-]+\.html$/i.test(base)) return null;
                if (q !== -1) {
                    var qs = d.substring(q + 1);
                    if (qs.length > 300) return null;
                    if (!/^[a-zA-Z0-9_.=&%-]+$/.test(qs)) return null;
                }
                return d;
            } catch (err) {
                return null;
            }
        }

        var ACCOUNT_PAGES = {
            "profile.html": true,
            "profile-setting.html": true,
            "profile-listing.html": true,
            "profile-message.html": true,
            "profile-favorite.html": true,
            "profile-bids.html": true,
            "dashboard.html": true,
            "add-listing.html": true
        };

        function pathBasename(path) {
            var p = String(path || "").replace(/\\/g, "/");
            var parts = p.split("/");
            return (parts[parts.length - 1] || "").toLowerCase();
        }

        function isAccountPageName(name) {
            return !!ACCOUNT_PAGES[name && name.toLowerCase()];
        }

        function checkoutGuard() {
            try {
                // Use pathname only — full href includes ?next=shop-checkout.html on login and would loop forever
                var path = window.location.pathname || "";
                if (path.indexOf("shop-checkout.html") === -1) return;
                if (isLoggedIn()) return;
                window.location.replace("login.html?next=" + encodeURIComponent("shop-checkout.html"));
            } catch (e) {}
        }

        function protectedAccountGuard() {
            try {
                if (isLoggedIn()) return;
                var base = pathBasename(window.location.pathname);
                if (!isAccountPageName(base)) return;
                window.location.replace("login.html?next=" + encodeURIComponent(base));
            } catch (e) {}
        }

        checkoutGuard();
        protectedAccountGuard();

        $(function() {
            $(document).on("click", 'a[href="shop-checkout.html"]', function(e) {
                if (isLoggedIn()) return;
                e.preventDefault();
                window.location.href = "login.html?next=" + encodeURIComponent("shop-checkout.html");
            });

            $(document).on("click", "a.coscharis-auction-lot-link", function(e) {
                if (isLoggedIn()) return;
                e.preventDefault();
                var href = ($(this).attr("href") || "").trim();
                if (!href || href.charAt(0) === "#") return;
                var clean = href.split("#")[0];
                window.location.href = "login.html?next=" + encodeURIComponent(clean);
            });

            $(document).on("click", "a", function(e) {
                if (isLoggedIn()) return;
                var raw = ($(this).attr("href") || "").trim();
                if (!raw || raw.charAt(0) === "#") return;
                if (/^https?:\/\//i.test(raw)) return;
                var clean = raw.split("#")[0].split("?")[0];
                var base = pathBasename(clean);
                if (!isAccountPageName(base)) return;
                e.preventDefault();
                window.location.href = "login.html?next=" + encodeURIComponent(base);
            });

            var qs = window.location.search || "";
            if (qs) {
                $('a[href="register.html"]').each(function() {
                    var $a = $(this);
                    if ($a.attr("href") === "register.html") $a.attr("href", "register.html" + qs);
                });
                $('a[href="login.html"]').each(function() {
                    var $a = $(this);
                    if ($a.attr("href") === "login.html") $a.attr("href", "login.html" + qs);
                });
            }

            $("#coscharis-login-form").on("submit", function(e) {
                e.preventDefault();
                var email = ($("#coscharis-login-email").val() || "").trim();
                var password = ($("#coscharis-login-password").val() || "").trim();
                var user = findUser(email);
                if (!user || String(user.password || "").trim() !== password) {
                    alert("Invalid email or password. If you are new here, please register first.");
                    return;
                }
                setSession(user);
                var rawNext = new URLSearchParams(window.location.search).get("next");
                var next = safeNext(rawNext);
                window.location.href = next || "profile.html";
            });

            $("#coscharis-register-form").on("submit", function(e) {
                e.preventDefault();
                var name = ($("#coscharis-register-name").val() || "").trim();
                var email = ($("#coscharis-register-email").val() || "").trim();
                var password = ($("#coscharis-register-password").val() || "").trim();
                if (!email || !password) {
                    alert("Please enter email and password.");
                    return;
                }
                email = email.toLowerCase().trim();
                if (findUser(email)) {
                    alert("This email is already registered. Please log in.");
                    return;
                }
                var users = loadUsers();
                users.push({ email: email, password: password, name: name });
                saveUsers(users);
                var regNext = safeNext(new URLSearchParams(window.location.search).get("next"));
                var loginQs = new URLSearchParams();
                loginQs.set("registered", "1");
                if (regNext) {
                    loginQs.set("next", regNext);
                } else {
                    loginQs.set("next", "profile.html");
                }
                window.location.href = "login.html?" + loginQs.toString();
            });

            if ($("#coscharis-login-form").length) {
                var sp = new URLSearchParams(window.location.search);
                if (sp.get("registered") === "1") {
                    var nextChk = safeNext(sp.get("next")) === "shop-checkout.html";
                    var msg =
                        "Account created successfully. Please sign in below.";
                    if (nextChk) {
                        msg +=
                            " After signing in you can open <a href=\"profile.html\">My Profile</a>, then continue to checkout when ready.";
                    } else {
                        msg +=
                            " You can visit <a href=\"profile.html\">My Profile</a> after signing in.";
                    }
                    $(".login-header p").first().append(
                        '<br><small class="text-success d-block mt-2">' + msg + "</small>"
                    );
                } else if (safeNext(sp.get("next")) === "shop-checkout.html") {
                    $(".login-header p").first().append(
                        '<br><small class="text-muted d-block mt-2">Sign in to complete your checkout.</small>'
                    );
                } else if (
                    safeNext(sp.get("next")) &&
                    /auction-lot\.html/i.test(safeNext(sp.get("next")))
                ) {
                    $(".login-header p").first().append(
                        '<br><small class="text-muted d-block mt-2">Sign in to place bids on live auctions.</small>'
                    );
                }
            }

            var $bidBtn = $("#coscharis-place-bid-btn");
            if ($bidBtn.length && !isLoggedIn()) {
                $bidBtn.removeAttr("data-bs-toggle").removeAttr("data-bs-target");
                $bidBtn.on("click", function(e) {
                    e.preventDefault();
                    var id = "";
                    try {
                        id = new URLSearchParams(window.location.search).get("id") || "";
                    } catch (err) {}
                    var next =
                        "auction-lot.html" +
                        (id ? "?id=" + encodeURIComponent(id) : "");
                    window.location.href =
                        "login.html?next=" + encodeURIComponent(next);
                });
            }
        });

        window.CoscharisAuth = {
            isLoggedIn: isLoggedIn,
            getSession: getSession,
            logout: logout
        };
    })();

    function tickCoscharisLiveClock() {
        var now = new Date();
        var txt = now.toLocaleString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        $(".coscharis-live-datetime-text").text(txt);
    }
    $(function() {
        tickCoscharisLiveClock();
        setInterval(tickCoscharisLiveClock, 1000);
    });
    $(document).on("click", "a.coscharis-live-datetime", function(e) {
        e.preventDefault();
    });

    $('.dropdown-menu a.dropdown-toggle').on('click', function(e) {
        if (!$(this).next().hasClass('show')) {
            $(this).parents('.dropdown-menu').first().find('.show').removeClass('show');
        }
        var $subMenu = $(this).next('.dropdown-menu');
        $subMenu.toggleClass('show');
        $(this).parents('li.nav-item.dropdown.show').on('hidden.bs.dropdown', function(e) {
            $('.dropdown-submenu .show').removeClass('show');
        });
        return false;
    });
    $(document).on('ready', function() {
        $("[data-background]").each(function() {
            $(this).css("background-image", "url(" + $(this).attr("data-background") + ")");
        });
    });
    $('.search-btn').on('click', function() {
        $('.search-area').toggleClass('open');
    });
    $('.sidebar-btn').on('click', function() {
        $('.sidebar-popup').addClass('open');
        $('.sidebar-wrapper').addClass('open');
    });
    $('.close-sidebar-popup, .sidebar-popup').on('click', function() {
        $('.sidebar-popup').removeClass('open');
        $('.sidebar-wrapper').removeClass('open');
    });
    
    $('.hero-slider').owlCarousel({
        loop: true,
        nav: true,
        dots: false,
        margin: 0,
        autoplay: true,
        autoplayHoverPause: true,
        autoplayTimeout: 5000,
        items: 1,
        navText: ["<i class='far fa-long-arrow-left'></i>", "<i class='far fa-long-arrow-right'></i>"],
        onInitialized: function(event) {
            var $firstAnimatingElements = $('.owl-item').eq(event.item.index).find("[data-animation]");
            doAnimations($firstAnimatingElements);
        },
        onChanged: function(event) {
            var $firstAnimatingElements = $('.owl-item').eq(event.item.index).find("[data-animation]");
            doAnimations($firstAnimatingElements);
        }
    });
    function doAnimations(elements) {
        var animationEndEvents = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
        elements.each(function() {
            var $this = $(this);
            var $animationDelay = $this.data('delay');
            var $animationDuration = $this.data('duration');
            var $animationType = 'animated ' + $this.data('animation');
            $this.css({
                'animation-delay': $animationDelay,
                '-webkit-animation-delay': $animationDelay,
                'animation-duration': $animationDuration,
                '-webkit-animation-duration': $animationDuration,
            });
            $this.addClass($animationType).one(animationEndEvents, function() {
                $this.removeClass($animationType);
            });
        });
    }
    $('.testimonial-slider').owlCarousel({
        loop: true,
        margin: 30,
        nav: false,
        dots: true,
        autoplay: true,
        responsive: {
            0: {
                items: 1
            },
            600: {
                items: 2
            },
            1000: {
                items: 4
            }
        }
    });
    var preloaderHidden = false;
    function hidePreloader() {
        if (preloaderHidden) return;
        preloaderHidden = true;
        $(".preloader").fadeOut("slow");
    }
    $(window).on('load', hidePreloader);
    /* If any asset hangs (network, third-party), `load` may never fire — still reveal the page */
    window.setTimeout(hidePreloader, 5000);

    // Favorites (New Arrivals / car cards)
    (function() {
        var STORAGE_KEY = "coscharis:favorites:v1";

        function safeParse(json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        }

        function loadFavorites() {
            var raw = localStorage.getItem(STORAGE_KEY);
            var parsed = safeParse(raw);
            if (!parsed || !Array.isArray(parsed)) return [];
            return parsed;
        }

        function saveFavorites(ids) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        }

        function buildCarId($carItem) {
            var title = ($carItem.find(".car-top h4 a").first().text() || "").trim();
            var img = ($carItem.find(".car-img img").first().attr("src") || "").trim();
            var price = ($carItem.find(".car-price").first().text() || "").trim();
            // Stable-enough id for static pages
            return [title, img, price].filter(Boolean).join("|").toLowerCase();
        }

        function setFavUI($btn, isFav) {
            $btn.toggleClass("is-favorited", !!isFav);
            $btn.attr("aria-pressed", !!isFav);
            var $icon = $btn.find("i");
            if ($icon.length) {
                $icon.toggleClass("far", !isFav);
                $icon.toggleClass("fas", !!isFav);
            }
        }

        function applyFavoritesToPage() {
            var favs = loadFavorites();
            $(".car-item").each(function() {
                var $car = $(this);
                var id = buildCarId($car);
                if (!id) return;
                $car.attr("data-fav-id", id);
                var $heartBtn = $car.find(".car-btns a").has("i.fa-heart").first();
                if (!$heartBtn.length) return;
                $heartBtn.attr("data-favorite-btn", "true");
                $heartBtn.attr("role", "button");
                setFavUI($heartBtn, favs.indexOf(id) !== -1);
            });
        }

        // Initial paint
        applyFavoritesToPage();

        // Delegated click handler
        $(document).on("click", ".car-item .car-btns a[data-favorite-btn='true']", function(e) {
            e.preventDefault();
            var $btn = $(this);
            var $car = $btn.closest(".car-item");
            var id = $car.attr("data-fav-id") || buildCarId($car);
            if (!id) return;

            var favs = loadFavorites();
            var idx = favs.indexOf(id);
            var isFav = idx === -1;
            if (isFav) favs.push(id);
            else favs.splice(idx, 1);
            saveFavorites(favs);
            setFavUI($btn, isFav);
        });
    })();

    // Car Details navigation + details-page rendering (auction-style)
    (function() {
        var DETAILS_KEY = "coscharis:selectedCar:v1";
        var DETAILS_PARAM = "car";
        var DETAILS_ID_PARAM = "id";
        var CARS_INDEX_URL = "coscharis/assets/data/cars.json";
        var carsIndexPromise = null;

        function pickText($root, selector) {
            return ($root.find(selector).first().text() || "").trim();
        }

        function pickAttr($root, selector, attr) {
            var v = $root.find(selector).first().attr(attr);
            return (v || "").trim();
        }

        function getCarFromCard($carItem) {
            var title = pickText($carItem, ".car-top h4 a");
            var img = pickAttr($carItem, ".car-img img", "src");
            var price = pickText($carItem, ".car-price");
            var status = pickText($carItem, ".car-status");
            var specs = $carItem.find(".car-list li").map(function() {
                return ($(this).text() || "").trim();
            }).get().filter(Boolean);

            return {
                title: title,
                img: img,
                price: price,
                status: status,
                specs: specs
            };
        }

        function base64UrlEncode(str) {
            // UTF-8 safe base64url
            var utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(_, p1) {
                return String.fromCharCode(parseInt(p1, 16));
            });
            var b64 = btoa(utf8);
            return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        }

        function base64UrlDecode(str) {
            var b64 = (str || "").replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            var utf8 = atob(b64);
            var esc = "";
            for (var i = 0; i < utf8.length; i++) {
                esc += "%" + ("00" + utf8.charCodeAt(i).toString(16)).slice(-2);
            }
            return decodeURIComponent(esc);
        }

        function getUrlParam(name) {
            try {
                var url = new URL(window.location.href);
                return url.searchParams.get(name);
            } catch (e) {
                return null;
            }
        }

        function fetchCarsIndex() {
            if (carsIndexPromise) return carsIndexPromise;
            carsIndexPromise = fetch(CARS_INDEX_URL, { cache: "no-store" })
                .then(function(r) {
                    if (!r.ok) throw new Error("cars index load failed");
                    return r.json();
                })
                .then(function(list) {
                    if (!Array.isArray(list)) return [];
                    return list;
                })
                .catch(function() {
                    return [];
                });
            return carsIndexPromise;
        }

        function normalizeTitle(s) {
            return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
        }

        function findCarIdFromIndex(indexList, car) {
            if (!indexList || !indexList.length || !car) return null;
            var title = normalizeTitle(car.title);
            var price = (car.price || "").trim();
            var img = (car.img || "").trim();
            for (var i = 0; i < indexList.length; i++) {
                var it = indexList[i] || {};
                if (!it.id) continue;
                if (title && normalizeTitle(it.title) !== title) continue;
                // Use price/img as tie-breakers if present
                if (price && (it.price || "").trim() !== price) continue;
                if (img && Array.isArray(it.images) && it.images.length && (it.images[0] || "").trim() !== img) continue;
                return it.id;
            }
            return null;
        }

        function applyIdsToCards() {
            fetchCarsIndex().then(function(indexList) {
                if (!indexList || !indexList.length) return;
                $(".car-item").each(function() {
                    var $car = $(this);
                    if ($car.attr("data-car-id")) return;
                    var card = getCarFromCard($car);
                    var id = findCarIdFromIndex(indexList, card);
                    if (!id) return;

                    $car.attr("data-car-id", id);

                    // Stamp clean, shareable links (auction-style)
                    var url = "inventory-single.html?" + DETAILS_ID_PARAM + "=" + encodeURIComponent(id);
                    var $details = $car.find(".car-footer a.theme-btn").first();
                    if ($details.length) $details.attr("href", url);
                    var $title = $car.find(".car-top h4 a").first();
                    if ($title.length) $title.attr("href", url);
                });
            });
        }

        function setInventorySingleFromCar(car) {
            if (!car) return;

            if (car.title) {
                $(".car-single-title").text(car.title);
                $(".breadcrumb-title").text(car.title);
                document.title = car.title + " — Coscharis";
            }

            if (car.status) {
                $(".car-single-top .car-status").text(car.status);
            }

            if (car.price) {
                $(".car-single-price").first().text(car.price);
            }

            function setKeyInfo(label, value) {
                if (!value) return;
                $(".car-key-item").each(function() {
                    var $item = $(this);
                    var l = ($item.find(".car-key-content span").first().text() || "").trim().toLowerCase();
                    if (l !== (label || "").toLowerCase()) return;
                    $item.find(".car-key-content h6").first().text(value);
                });
            }

            // Auction-style key fields
            setKeyInfo("Body Type", car.bodyType);
            setKeyInfo("Condition", car.condition || car.status);
            setKeyInfo("Mileage", car.mileage);
            setKeyInfo("Transmission", car.transmission);
            setKeyInfo("Year", car.year);
            setKeyInfo("Fuel Type", car.fuelType);
            setKeyInfo("Color", car.color);
            setKeyInfo("Doors", car.doors);
            setKeyInfo("Cylinders", car.cylinders);
            setKeyInfo("Engine Size", car.engineSize);
            setKeyInfo("VIN", car.vin);

            // Auction-style top strip
            if (car.stockNo) $(".car-stock-no").text(car.stockNo);
            if (car.vin) $(".car-vin").text(car.vin);
            if (car.location) $(".car-location").text(car.location);
            if (car.lotNo) $(".car-lot-no").text(car.lotNo);
            if (car.auctionDate) $(".car-auction-date").text(car.auctionDate);
            if (car.seller) $(".car-seller").text(car.seller);
            if (car.conditionReport) $(".car-condition-report").text(car.conditionReport);

            // Right-side meta (mileage + location) if present
            if (car.mileage) {
                var $m = $(".car-single-widget .car-single-meta li").first();
                if ($m.length) {
                    var $iconM = $m.find("i").first().clone();
                    $m.empty().append($iconM).append(" " + car.mileage);
                }
            }
            if (car.location) {
                var $loc = $(".car-single-widget .car-single-meta li").eq(1);
                if ($loc.length) {
                    var $iconL = $loc.find("i").first().clone();
                    $loc.empty().append($iconL).append(" " + car.location);
                }
            }

            // Images: support either `images[]` (preferred) or `img` (fallback)
            var images = [];
            if (Array.isArray(car.images) && car.images.length) images = car.images.slice(0);
            else if (car.img) images = [car.img, car.img, car.img, car.img];

            if (images.length) {
                // IMPORTANT: FlexSlider is initialized later in this file.
                // Updating slides IN-PLACE avoids breaking the plugin.
                var $slides = $(".car-single-slider .slides li");
                if ($slides.length) {
                    $slides.each(function(idx) {
                        var src = images[idx % images.length];
                        $(this).attr("data-thumb", src);
                        var $img = $(this).find("img").first();
                        $img.attr("src", src);
                        $img.attr("alt", car.title || "Car image");
                    });
                }
            }

            // Best-effort: update the right-side meta line 1 with a spec
            if (Array.isArray(car.specs) && car.specs.length) {
                var $meta = $(".car-single-widget .car-single-meta li").first();
                if ($meta.length) {
                    // keep icon, replace text
                    var $icon = $meta.find("i").first().clone();
                    $meta.empty().append($icon).append(" " + car.specs[0]);
                }
            }
        }

        // Clicking "Details" on any car card opens inventory-single with that car
        $(document).on("click", ".car-item .car-footer a.theme-btn", function(e) {
            var $btn = $(this);
            // Only treat as "Details" when it contains an eye icon or says Details
            var txt = ($btn.text() || "").toLowerCase();
            var isDetails = $btn.find(".fa-eye").length > 0 || txt.indexOf("details") !== -1;
            if (!isDetails) return;

            var $carItem = $btn.closest(".car-item");
            if (!$carItem.length) return;

            e.preventDefault();
            var car = getCarFromCard($carItem);
            localStorage.setItem(DETAILS_KEY, JSON.stringify(car));
            // Auction-style: prefer short id URLs (shareable + clean)
            var existingId = $carItem.attr("data-car-id");
            if (existingId) {
                window.location.href = "inventory-single.html?" + DETAILS_ID_PARAM + "=" + encodeURIComponent(existingId);
                return;
            }

            fetchCarsIndex().then(function(indexList) {
                var id = findCarIdFromIndex(indexList, car);
                if (id) {
                    $carItem.attr("data-car-id", id);
                    window.location.href = "inventory-single.html?" + DETAILS_ID_PARAM + "=" + encodeURIComponent(id);
                    return;
                }

                // Fallback: encoded payload URL (still shareable)
                var payload = base64UrlEncode(JSON.stringify(car));
                window.location.href = "inventory-single.html?" + DETAILS_PARAM + "=" + encodeURIComponent(payload);
            });
        });

        // If we are on the details page, render selected car
        if ($("body").hasClass("page-inventory-single")) {
            var idParam = getUrlParam(DETAILS_ID_PARAM);
            if (idParam) {
                fetchCarsIndex().then(function(indexList) {
                    var found = null;
                    for (var i = 0; i < indexList.length; i++) {
                        if (indexList[i] && indexList[i].id === idParam) {
                            found = indexList[i];
                            break;
                        }
                    }
                    if (found) {
                        // Index shape is the canonical source
                        var carFromIndex = {
                            id: found.id,
                            title: found.title,
                            price: found.price,
                            status: found.status,
                            specs: found.specs || [],
                            images: found.images || [],
                            img: (found.images && found.images[0]) ? found.images[0] : "",
                            year: found.year,
                            bodyType: found.bodyType,
                            condition: found.condition,
                            mileage: found.mileage,
                            transmission: found.transmission,
                            fuelType: found.fuelType,
                            color: found.color,
                            doors: found.doors,
                            cylinders: found.cylinders,
                            engineSize: found.engineSize,
                            vin: found.vin,
                            stockNo: found.stockNo,
                            location: found.location
                        };
                        setInventorySingleFromCar(carFromIndex);
                        localStorage.setItem(DETAILS_KEY, JSON.stringify(carFromIndex));
                    }
                });
            }

            var fromUrl = getUrlParam(DETAILS_PARAM);
            if (fromUrl) {
                try {
                    var decoded = base64UrlDecode(fromUrl);
                    var car = JSON.parse(decoded);
                    setInventorySingleFromCar(car);
                    // keep in storage as fallback for next visits
                    localStorage.setItem(DETAILS_KEY, JSON.stringify(car));
                } catch (e) {}
            } else {
                var raw = localStorage.getItem(DETAILS_KEY);
                if (raw) {
                    try {
                        var car2 = JSON.parse(raw);
                        setInventorySingleFromCar(car2);
                    } catch (e2) {}
                }
            }
        } else {
            // Non-details pages: attempt to stamp data-car-id for cleaner links
            applyIdsToCards();
        }
    })();

    // Shopping cart (header badge + localStorage + cart page UI)
    (function() {
        var CART_KEY = "coscharis:cart:v1";
        var PLACEHOLDER_IMG = "coscharis/assets/img/shop/01.jpg";

        function safeParse(json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        }

        function loadCart() {
            var raw = localStorage.getItem(CART_KEY);
            var parsed = safeParse(raw);
            if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
            return parsed;
        }

        function saveCart(cart) {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            try {
                window.dispatchEvent(new CustomEvent("coscharis-cart-updated", { detail: cart }));
            } catch (e) {}
        }

        function buildLineId(parts) {
            return parts.filter(Boolean).join("|").toLowerCase();
        }

        function parsePrice(s) {
            if (!s) return 0;
            var cleaned = String(s).replace(/[^\d]/g, "");
            if (!cleaned) return 0;
            return parseInt(cleaned, 10) || 0;
        }

        function getSiteCurrencySymbol() {
            try {
                var raw = localStorage.getItem("coscharis:site-settings:v1");
                var o = raw ? JSON.parse(raw) : null;
                if (o && o.currencySymbol) {
                    var c = String(o.currencySymbol).trim();
                    if (c) return c;
                }
            } catch (e) {}
            return "₦";
        }

        function formatNaira(n) {
            var num = Number(n) || 0;
            return getSiteCurrencySymbol() + num.toLocaleString("en-NG");
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

        function getTotalQty(cart) {
            var c = cart || loadCart();
            var n = 0;
            if (!c.items || !c.items.length) return 0;
            for (var i = 0; i < c.items.length; i++) {
                var q = parseInt(c.items[i].qty, 10);
                n += isNaN(q) || q < 1 ? 0 : q;
            }
            return n;
        }

        function updateCartBadge() {
            var total = getTotalQty();
            var label = total > 99 ? "99+" : String(total);
            $(".cart-btn .nav-right-link span").text(label);
        }

        function cartLineTotal(line) {
            var unit = parsePrice(line.price);
            var q = parseInt(line.qty, 10) || 1;
            return unit * q;
        }

        function cartGrandTotal(cart) {
            var c = cart || loadCart();
            var sum = 0;
            if (!c.items) return 0;
            for (var i = 0; i < c.items.length; i++) {
                sum += cartLineTotal(c.items[i]);
            }
            return sum;
        }

        function renderCartTable() {
            var $tb = $("#coscharis-cart-tbody");
            if (!$tb.length) return;

            var cart = loadCart();
            $tb.empty();

            if (!cart.items.length) {
                $tb.append(
                    '<tr class="cart-empty-row"><td colspan="6" class="text-center py-5">' +
                        "Your cart is empty. <a href=\"shop.html\">Continue shopping</a>" +
                        "</td></tr>"
                );
                $("#coscharis-cart-subtotal, #coscharis-cart-total").text(formatNaira(0));
                return;
            }

            for (var i = 0; i < cart.items.length; i++) {
                var it = cart.items[i];
                var unit = parsePrice(it.price);
                var qty = parseInt(it.qty, 10) || 1;
                var sub = unit * qty;
                var imgSrc = (it.image || "").trim() || PLACEHOLDER_IMG;
                var idAttr = encodeURIComponent(it.id);
                var priceDisplay = it.price && String(it.price).trim() ? it.price : formatNaira(unit);

                var $tr = $("<tr></tr>").attr("data-line-id", idAttr);
                $tr.append(
                    '<td><div class="cart-img"><img src="' +
                        escapeAttr(imgSrc) +
                        '" alt="' +
                        escapeAttr(it.title) +
                        '"></div></td>'
                );
                $tr.append("<td><h5>" + escapeHtml(it.title || "Product") + "</h5></td>");
                $tr.append(
                    '<td><div class="cart-price"><span>' + escapeHtml(priceDisplay) + "</span></div></td>"
                );
                $tr.append(
                    '<td><div class="cart-qty cart-page-qty">' +
                        '<button type="button" class="minus-btn cart-page-qty-btn"><i class="fal fa-minus"></i></button>' +
                        '<input class="quantity" type="text" value="' +
                        qty +
                        '" readonly>' +
                        '<button type="button" class="plus-btn cart-page-qty-btn"><i class="fal fa-plus"></i></button>' +
                        "</div></td>"
                );
                $tr.append(
                    '<td><div class="cart-sub-total"><span>' +
                        escapeHtml(formatNaira(sub)) +
                        "</span></div></td>"
                );
                $tr.append(
                    '<td><a href="#" class="cart-remove" role="button" aria-label="Remove"><i class="far fa-times"></i></a></td>'
                );
                $tb.append($tr);
            }

            var grand = cartGrandTotal(cart);
            $("#coscharis-cart-subtotal, #coscharis-cart-total").text(formatNaira(grand));
        }

        function renderCheckoutSummary() {
            var $items = $("#coscharis-checkout-items");
            if (!$items.length) return;

            var cart = loadCart();
            var $empty = $("#coscharis-checkout-empty");
            var $body = $("#coscharis-checkout-body");

            if (!cart.items.length) {
                if ($empty.length) {
                    $empty.show().html(
                        '<p class="mb-3">Your cart is empty.</p>' +
                            '<a href="shop.html" class="theme-btn">Continue shopping</a> ' +
                            '<a href="shop-cart.html" class="theme-btn ms-2">View cart</a>'
                    );
                }
                if ($body.length) $body.hide();
                $("#coscharis-checkout-qty").text("0");
                $("#coscharis-checkout-subtotal, #coscharis-checkout-total").text(formatNaira(0));
                return;
            }

            if ($empty.length) $empty.hide();
            if ($body.length) $body.show();

            $items.empty();
            for (var i = 0; i < cart.items.length; i++) {
                var it = cart.items[i];
                var unit = parsePrice(it.price);
                var qty = parseInt(it.qty, 10) || 1;
                var lineSub = unit * qty;
                var imgSrc = (it.image || "").trim() || PLACEHOLDER_IMG;
                var priceDisplay = it.price && String(it.price).trim() ? it.price : formatNaira(unit);

                var $li = $(
                    '<li class="d-flex align-items-center mb-3 pb-3 border-bottom coscharis-checkout-line"></li>'
                );
                $li.append(
                    '<div class="flex-shrink-0 me-3" style="width:56px;height:56px;overflow:hidden;border-radius:6px;">' +
                        '<img src="' +
                        escapeAttr(imgSrc) +
                        '" alt="" style="width:100%;height:100%;object-fit:cover;">' +
                        "</div>"
                );
                $li.append(
                    '<div class="flex-grow-1 min-w-0">' +
                        "<div><strong>" +
                        escapeHtml(it.title || "Product") +
                        "</strong></div>" +
                        '<div class="small text-muted">' +
                        escapeHtml(String(qty)) +
                        " × " +
                        escapeHtml(priceDisplay) +
                        "</div>" +
                        "</div>"
                );
                $li.append(
                    '<div class="flex-shrink-0 text-end fw-semibold">' +
                        escapeHtml(formatNaira(lineSub)) +
                        "</div>"
                );
                $items.append($li);
            }

            var grand = cartGrandTotal(cart);
            var qtyTotal = getTotalQty(cart);
            $("#coscharis-checkout-qty").text(String(qtyTotal));
            $("#coscharis-checkout-subtotal, #coscharis-checkout-total").text(formatNaira(grand));
        }

        function removeItemById(id) {
            if (!id) return;
            var cart = loadCart();
            cart.items = cart.items.filter(function(it) {
                return it.id !== id;
            });
            saveCart(cart);
        }

        function setQtyForId(id, qty) {
            var q = parseInt(qty, 10);
            if (isNaN(q) || q < 1) q = 1;
            var cart = loadCart();
            for (var i = 0; i < cart.items.length; i++) {
                if (cart.items[i].id === id) {
                    cart.items[i].qty = q;
                    break;
                }
            }
            saveCart(cart);
        }

        function addLine(line) {
            if (!line || !line.id) return;
            var qty = parseInt(line.qty, 10);
            if (isNaN(qty) || qty < 1) qty = 1;
            var cart = loadCart();
            var found = -1;
            for (var i = 0; i < cart.items.length; i++) {
                if (cart.items[i].id === line.id) {
                    found = i;
                    break;
                }
            }
            if (found === -1) {
                cart.items.push({
                    id: line.id,
                    title: line.title || "Item",
                    price: line.price || "",
                    image: line.image || "",
                    qty: qty
                });
            } else {
                cart.items[found].qty = (parseInt(cart.items[found].qty, 10) || 0) + qty;
            }
            saveCart(cart);
        }

        function itemFromShopCard($shop) {
            var explicit = ($shop.attr("data-cart-id") || "").trim();
            var title = ($shop.find(".shop-item-title").first().text() || "").trim();
            var price = ($shop.find(".shop-item-price").first().text() || "").trim();
            var img = ($shop.find(".shop-item-img img").first().attr("src") || "").trim();
            var id = explicit || buildLineId(["shop", title, price, img]);
            return {
                id: id,
                title: title || "Product",
                price: price,
                image: img,
                qty: 1
            };
        }

        function itemFromShopSingle() {
            var $info = $(".single-item-info").first();
            if (!$info.length) return null;
            var explicit = ($info.attr("data-cart-id") || "").trim();
            var title = ($info.find(".single-item-title").first().text() || "").trim();
            var price = ($info.find(".single-item-price h4 span").first().text() || "").trim();
            if (!price) price = ($info.find(".single-item-price").first().text() || "").trim();
            var img = ($("#coscharis-single-main-img").attr("src") || $(".item-gallery img").first().attr("src") || "").trim();
            var id = explicit || buildLineId(["single", title, price, img]);
            var q = parseInt($(".single-item-action .cart-qty .quantity").val(), 10);
            if (isNaN(q) || q < 1) q = 1;
            return {
                id: id,
                title: title || "Product",
                price: price,
                image: img,
                qty: q
            };
        }

        $(document).on("click", ".shop-item .shop-item-meta a", function(e) {
            var $a = $(this);
            if (!$a.find("i.fa-shopping-cart").length) return;
            e.preventDefault();
            var $shop = $a.closest(".shop-item");
            if (!$shop.length) return;
            var line = itemFromShopCard($shop);
            addLine(line);
        });

        $(document).on("click", ".single-item-action .theme-btn", function(e) {
            var $btn = $(this);
            if (!$btn.find(".fa-shopping-cart").length) return;
            e.preventDefault();
            var line = itemFromShopSingle();
            if (!line) return;
            addLine(line);
        });

        $(document).on("click", "#coscharis-cart-tbody .cart-remove", function(e) {
            e.preventDefault();
            var id = $(this).closest("tr").attr("data-line-id");
            if (!id) return;
            try {
                id = decodeURIComponent(id);
            } catch (err) {
                return;
            }
            removeItemById(id);
        });

        $(document).on("click", "#coscharis-cart-tbody .cart-page-qty .plus-btn", function(e) {
            e.preventDefault();
            var $tr = $(this).closest("tr");
            var raw = $tr.attr("data-line-id");
            if (!raw) return;
            var id;
            try {
                id = decodeURIComponent(raw);
            } catch (err) {
                return;
            }
            var $inp = $tr.find(".quantity");
            var qty = parseInt($inp.val(), 10) || 1;
            setQtyForId(id, qty + 1);
        });

        $(document).on("click", "#coscharis-cart-tbody .cart-page-qty .minus-btn", function(e) {
            e.preventDefault();
            var $tr = $(this).closest("tr");
            var raw = $tr.attr("data-line-id");
            if (!raw) return;
            var id;
            try {
                id = decodeURIComponent(raw);
            } catch (err) {
                return;
            }
            var $inp = $tr.find(".quantity");
            var qty = parseInt($inp.val(), 10) || 1;
            if (qty <= 1) {
                removeItemById(id);
            } else {
                setQtyForId(id, qty - 1);
            }
        });

        $(".cart-btn .nav-right-link").each(function() {
            var $a = $(this);
            var h = $a.attr("href");
            if (!h || h === "#") {
                $a.attr("href", "shop-cart.html");
            }
        });

        var ORDERS_KEY = "coscharis:orders:v1";

        function loadOrders() {
            var raw = localStorage.getItem(ORDERS_KEY);
            var parsed = safeParse(raw);
            if (!parsed || !Array.isArray(parsed)) return [];
            return parsed;
        }

        function saveOrders(orders) {
            localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        }

        function clearCartStorage() {
            saveCart({ items: [] });
        }

        function validateCheckoutFields() {
            var errs = [];
            function need(id, msg) {
                var v = ($("#" + id).val() || "").trim();
                if (!v) errs.push(msg);
                return v;
            }

            need("coscharis-chk-bill-first", "Billing first name is required.");
            need("coscharis-chk-bill-last", "Billing last name is required.");
            var billEmail = ($("#coscharis-chk-bill-email").val() || "").trim();
            if (!billEmail) errs.push("Billing email is required.");
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billEmail)) errs.push("Enter a valid billing email.");
            need("coscharis-chk-bill-phone", "Billing phone is required.");
            need("coscharis-chk-bill-address", "Billing address is required.");

            need("coscharis-chk-pay-name", "Card holder name is required.");
            var cardRaw = ($("#coscharis-chk-pay-card").val() || "").replace(/\s/g, "");
            if (!cardRaw || !/^\d{13,19}$/.test(cardRaw)) {
                errs.push("Enter a valid card number (13–19 digits).");
            }
            var exp = ($("#coscharis-chk-pay-exp").val() || "").trim();
            if (!exp) errs.push("Card expiry is required.");
            else if (!/^\d{1,2}\s*\/\s*\d{2,4}$/.test(exp) && !/^\d{4}$/.test(exp.replace(/\//g, ""))) {
                errs.push("Use expiry format MM/YY.");
            }
            var cvv = ($("#coscharis-chk-pay-cvv").val() || "").replace(/\s/g, "");
            if (!cvv || !/^\d{3,4}$/.test(cvv)) errs.push("Enter a valid CVV (3 or 4 digits).");

            need("coscharis-chk-ship-first", "Shipping first name is required.");
            need("coscharis-chk-ship-last", "Shipping last name is required.");
            var shipEmail = ($("#coscharis-chk-ship-email").val() || "").trim();
            if (!shipEmail) errs.push("Shipping email is required.");
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipEmail)) errs.push("Enter a valid shipping email.");
            need("coscharis-chk-ship-phone", "Shipping phone is required.");
            need("coscharis-chk-ship-addr1", "Shipping address line 1 is required.");

            return errs;
        }

        $(document).on("click", "#coscharis-checkout-confirm", function() {
            var $btn = $(this);
            var $errBox = $("#coscharis-checkout-errors");
            if (!$btn.length) return;

            if ($errBox.length) {
                $errBox.addClass("d-none").empty();
            }

            if (!getTotalQty()) {
                if ($errBox.length) {
                    $errBox.removeClass("d-none").text("Your cart is empty. Add items before confirming payment.");
                }
                return;
            }

            var errs = validateCheckoutFields();
            if (errs.length) {
                if ($errBox.length) {
                    $errBox
                        .removeClass("d-none")
                        .html(errs.map(function(x) {
                            return "<div>" + escapeHtml(x) + "</div>";
                        }).join(""));
                }
                return;
            }

            var cart = loadCart();
            var grand = cartGrandTotal(cart);
            var orderId =
                "ORD-" +
                Date.now().toString(36).toUpperCase() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 7)
                    .toUpperCase();

            var cardDigits = ($("#coscharis-chk-pay-card").val() || "").replace(/\s/g, "");
            var order = {
                id: orderId,
                createdAt: new Date().toISOString(),
                total: grand,
                items: JSON.parse(JSON.stringify(cart.items || [])),
                billing: {
                    first: ($("#coscharis-chk-bill-first").val() || "").trim(),
                    last: ($("#coscharis-chk-bill-last").val() || "").trim(),
                    email: ($("#coscharis-chk-bill-email").val() || "").trim(),
                    phone: ($("#coscharis-chk-bill-phone").val() || "").trim(),
                    address: ($("#coscharis-chk-bill-address").val() || "").trim()
                },
                payment: {
                    cardLast4: cardDigits.slice(-4)
                },
                shipping: {
                    first: ($("#coscharis-chk-ship-first").val() || "").trim(),
                    last: ($("#coscharis-chk-ship-last").val() || "").trim(),
                    email: ($("#coscharis-chk-ship-email").val() || "").trim(),
                    phone: ($("#coscharis-chk-ship-phone").val() || "").trim(),
                    address1: ($("#coscharis-chk-ship-addr1").val() || "").trim(),
                    address2: ($("#coscharis-chk-ship-addr2").val() || "").trim(),
                    note: ($("#coscharis-chk-ship-note").val() || "").trim()
                }
            };

            var origHtml = $btn.html();
            $btn.prop("disabled", true).html(
                'Processing... <i class="fas fa-spinner fa-spin"></i>'
            );

            window.setTimeout(function() {
                var orders = loadOrders();
                orders.unshift(order);
                saveOrders(orders);

                clearCartStorage();
                syncCartUI();

                $("#coscharis-order-id").text(orderId);
                $("#coscharis-order-total").text(formatNaira(grand));
                $("#coscharis-order-time").text(
                    new Date(order.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short"
                    })
                );

                $("#coscharis-checkout-active").hide();
                $("#coscharis-checkout-success").show();

                var $ok = $("#coscharis-checkout-success");
                if ($ok.length && $ok.offset()) {
                    $("html, body").animate(
                        { scrollTop: $ok.offset().top - 100 },
                        350
                    );
                }

                $btn.prop("disabled", false).html(origHtml);
            }, 280);
        });

        function syncCartUI() {
            updateCartBadge();
            renderCartTable();
            renderCheckoutSummary();
            $(".coscharis-profile-cart-count").text(String(getTotalQty()));
        }

        syncCartUI();

        window.addEventListener("storage", function(ev) {
            if (ev.key === CART_KEY) syncCartUI();
        });

        window.addEventListener("coscharis-cart-updated", syncCartUI);

        window.CoscharisCart = {
            getCart: loadCart,
            getTotalQty: function() {
                return getTotalQty();
            },
            refreshBadge: updateCartBadge,
            renderCart: renderCartTable,
            renderCheckout: renderCheckoutSummary,
            removeItem: removeItemById
        };
    })();

    // Site settings (public) — managed in admin-settings.html, key coscharis:site-settings:v1
    (function($) {
        var KEY = "coscharis:site-settings:v1";

        function safeParse(json) {
            try {
                return JSON.parse(json);
            } catch (e) {
                return null;
            }
        }

        function defaults() {
            return {
                siteName: "Coscharis",
                siteTitleSuffix: "Car Dealer And Automotive",
                supportEmail: "info@example.com",
                publicPhone: "+2 123 654 7898",
                addressLine: "25/B Milford Road, New York",
                themeColor: "#e63035",
                currencySymbol: "₦",
                businessHours: "Mon–Sat 9:00–18:00",
                maintenanceMode: false,
                maintenanceMessage: "We're performing brief maintenance. Please try again shortly."
            };
        }

        function load() {
            var o = safeParse(localStorage.getItem(KEY));
            if (!o || typeof o !== "object") return defaults();
            var d = defaults();
            for (var k in d) {
                if (Object.prototype.hasOwnProperty.call(d, k) && o[k] === undefined) o[k] = d[k];
            }
            return o;
        }

        function apply() {
            var s = load();
            var name = (s.siteName || "").trim() || defaults().siteName;
            var suf = (s.siteTitleSuffix || "").trim() || defaults().siteTitleSuffix;
            document.title = name + " - " + suf;

            var tc = (s.themeColor || "").trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(tc)) {
                $('meta[name="theme-color"]').attr("content", tc);
            }

            var em = (s.supportEmail || "").trim();
            if (em) {
                $(".coscharis-dynamic-email").attr("href", "mailto:" + em);
                $(".coscharis-dynamic-email-text").text(em);
            }

            var ph = (s.publicPhone || "").trim();
            if (ph) {
                var digits = ph.replace(/\D/g, "");
                if (digits.length) {
                    $(".coscharis-dynamic-phone").attr("href", "tel:+" + digits);
                }
                $(".coscharis-dynamic-phone-text").text(ph);
            }

            var addr = (s.addressLine || "").trim();
            if (addr) {
                var $a = $("#coscharis-site-address");
                if ($a.length) $a.text(addr);
            }

            var hrs = (s.businessHours || "").trim();
            if (hrs) {
                $("[data-coscharis-hours]").text(hrs);
            }

            $("#coscharis-maintenance-banner").remove();
            if (s.maintenanceMode) {
                var msg = (s.maintenanceMessage || defaults().maintenanceMessage).trim();
                var $ban = $(
                    '<div id="coscharis-maintenance-banner" style="position:relative;z-index:99998;background:linear-gradient(135deg,#3c3e90,#e63035);color:#fff;padding:10px 16px;text-align:center;font-size:0.9rem;font-weight:600"></div>'
                );
                $ban.text(msg);
                $("body").prepend($ban);
            }
        }

        $(function() {
            apply();
        });
        window.addEventListener("storage", function(ev) {
            if (ev.key === KEY) apply();
        });
    })(jQuery);

    $('.counter').countTo();
    $('.counter-box').appear(function() {
        $('.counter').countTo();
    }, {
        accY: -100
    });
    $(".popup-gallery").magnificPopup({
        delegate: '.popup-img',
        type: 'image',
        gallery: {
            enabled: true
        },
    });
    $(".popup-youtube, .popup-vimeo, .popup-gmaps").magnificPopup({
        type: "iframe",
        mainClass: "mfp-fade",
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false
    });
    $(window).scroll(function() {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            $("#scroll-top").addClass('active');
        } else {
            $("#scroll-top").removeClass('active');
        }
    });
    $("#scroll-top").on('click', function() {
        $("html, body").animate({
            scrollTop: 0
        }, 1500);
        return false;
    });
    $(window).scroll(function() {
        if ($(this).scrollTop() > 50) {
            $('.navbar').addClass("fixed-top");
        } else {
            $('.navbar').removeClass("fixed-top");
        }
    });
    if ($('#countdown').length) {
        $('#countdown').countdown('2028/01/30', function(event) {
            $(this).html(event.strftime('' + '<div class="row">' + '<div class="col countdown-single">' + '<h2 class="mb-0">%-D</h2>' + '<h5 class="mb-0">Day%!d</h5>' + '</div>' + '<div class="col countdown-single">' + '<h2 class="mb-0">%H</h2>' + '<h5 class="mb-0">Hours</h5>' + '</div>' + '<div class="col countdown-single">' + '<h2 class="mb-0">%M</h2>' + '<h5 class="mb-0">Minutes</h5>' + '</div>' + '<div class="col countdown-single">' + '<h2 class="mb-0">%S</h2>' + '<h5 class="mb-0">Seconds</h5>' + '</div>' + '</div>'));
        });
    }
    let date = new Date().getFullYear();
    $("#date").html(date);
    $('.select').niceSelect();
    if ($(".price-range").length) {
        $(".price-range").slider({
            range: true,
            min: 0,
            max: 999,
            values: [100, 500],
            slide: function(event, ui) {
                var lo = (ui.values[0] * 1600).toLocaleString("en-NG");
                var hi = (ui.values[1] * 1600).toLocaleString("en-NG");
                $("#price-amount").val("₦" + lo + " - ₦" + hi);
            }
        });
        var v0 = $(".price-range").slider("values", 0);
        var v1 = $(".price-range").slider("values", 1);
        $("#price-amount").val(
            "₦" + (v0 * 1600).toLocaleString("en-NG") + " - ₦" + (v1 * 1600).toLocaleString("en-NG")
        );
    }
    $(".plus-btn").on("click", function() {
        var i = $(this).closest(".cart-qty").children(".quantity").get(0).value++
          , c = $(this).closest(".cart-qty").children(".minus-btn");
        i > 0 && c.removeAttr("disabled");
    }),
    $(".minus-btn").on("click", function() {
        2 == $(this).closest(".cart-qty").children(".quantity").get(0).value-- && $(this).attr("disabled", "disabled");
    })
    if ($('.flexslider-thumbnails').length) {
        $('.flexslider-thumbnails').flexslider({
            animation: "slide",
            controlNav: "thumbnails",
        });
    }
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
    $(".profile-img-btn").on('click', function() {
        $(".profile-img-file").click();
    });
    $(".list-img-upload").on('click', function() {
        $(".list-img-file").click();
    });
    $(".store-upload").on('click', function(e) {
        $(e.target).closest(".form-group").find('.store-file').click();
    });
    if ($('.message-content-info').length) {
        $(function() {
            var chatbox = $('.message-content-info');
            var chatheight = chatbox[0].scrollHeight;
            chatbox.scrollTop(chatheight);
        });
    }
}
)(jQuery);
