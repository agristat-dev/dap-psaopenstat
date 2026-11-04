(function () {
  var origin = "";
  if (!origin) return;
  var head = document.head;
  if (!head) return;
  function link(rel, href, crossOrigin) {
    if (document.querySelector('link[rel="' + rel + '"][href="' + href + '"]')) return;
    var el = document.createElement("link");
    el.rel = rel;
    el.href = href;
    if (crossOrigin) el.crossOrigin = crossOrigin;
    head.appendChild(el);
  }
  link("dns-prefetch", origin);
  link("preconnect", origin, "anonymous");
})();
