/**
 * Contact form — saves submissions to localStorage for admin-contact.html (demo).
 * Key: coscharis:contact-leads:v1
 */
(function ($) {
  "use strict";

  var CONTACT_KEY = "coscharis:contact-leads:v1";

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function loadLeads() {
    var u = safeParse(localStorage.getItem(CONTACT_KEY));
    return Array.isArray(u) ? u : [];
  }

  function saveLeads(leads) {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(leads));
  }

  function genId() {
    return "cl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  $(function () {
    var $form = $("#contact-form");
    if (!$form.length) return;

    $form.on("submit", function (e) {
      e.preventDefault();

      var name = ($form.find('[name="name"]').val() || "").trim();
      var email = ($form.find('[name="email"]').val() || "").trim();
      var subject = ($form.find('[name="subject"]').val() || "").trim();
      var message = ($form.find('[name="message"]').val() || "").trim();

      var $msg = $form.find(".form-messege");
      if (!name || !email || !subject) {
        $msg.removeClass("text-success").addClass("text-danger");
        $msg.text("Please fill in your name, email, and subject.");
        return;
      }

      var leads = loadLeads();
      leads.unshift({
        id: genId(),
        name: name,
        email: email,
        subject: subject,
        message: message,
        createdAt: new Date().toISOString(),
        read: false
      });
      saveLeads(leads);

      $msg.removeClass("text-danger").addClass("text-success");
      $msg.text("Thank you! Your message has been received.");
      if ($form[0]) $form[0].reset();
    });
  });
})(jQuery);
