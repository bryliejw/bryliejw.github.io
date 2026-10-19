// Top-right site nav: About, Folio PDF, Contact. Contact is a mailto link without JS;
// here it opens a popover with the contact lines from data/nodes.json (me.contact).
import { h, icon } from "./dom.js";
import { togglePopover } from "./rail.js";

export function bindNav({ data, actions }) {
  const c = data.me.contact;
  const contact = document.getElementById("btn-contact");
  contact.setAttribute("role", "button");
  contact.setAttribute("aria-expanded", "false");
  contact.setAttribute("aria-controls", "pop-contact");
  // A link with role=button also opens on Space.
  contact.addEventListener("keydown", (e) => {
    if (e.key !== " ") return;
    e.preventDefault();
    contact.click();
  });

  const ext = (href, text) => h("a", { href, target: "_blank", rel: "noopener" }, text, icon("arrow-up-right"));
  const line = (label, link) => [h("dt", { class: "mono-label" }, label), h("dd", {}, link)];
  document.getElementById("pop-contact").append(
    h("dl", { class: "contact" },
      line("Email", h("a", { href: `mailto:${c.email}` }, c.email)),
      line("Instagram", ext(c.instagram.url, c.instagram.label)),
      line("LinkedIn", ext(c.linkedin.url, c.linkedin.label)),
    ),
  );

  document.getElementById("btn-about").addEventListener("click", actions.about);
  return { contact: () => togglePopover(contact) };
}
