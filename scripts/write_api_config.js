const fs = require("fs");
const path = require("path");

const DEFAULT_ORIGIN = "";
const origin = String(process.env.API_ORIGIN || DEFAULT_ORIGIN)
  .trim()
  .replace(/\/$/, "");
const assetsDir = path.join(__dirname, "..", "static", "assets");
const configOut = path.join(assetsDir, "config.js");
const hintsOut = path.join(assetsDir, "api-hints.js");

const configContents = `window.AGRI_API_BASE = (function () {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "";
  return ${JSON.stringify(origin)};
})();

window.agriApiUrl = function agriApiUrl(path) {
  const base = String(window.AGRI_API_BASE || "").replace(/\\/$/, "");
  const suffix = path.startsWith("/") ? path : \`/\${path}\`;
  return base ? \`\${base}\${suffix}\` : suffix;
};
`;

const hintsContents = `(function () {
  var origin = ${JSON.stringify(origin)};
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
`;

fs.writeFileSync(configOut, configContents);
fs.writeFileSync(hintsOut, hintsContents);
console.log(`Wrote static/assets/config.js with API_ORIGIN=${origin || "(same-origin)"}`);
console.log(`Wrote static/assets/api-hints.js`);
