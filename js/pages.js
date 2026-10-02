/**
 * Vypínání stránek → místo nich se ukáže 404.
 *
 * Názvy stránek: index, about, portfolio, galerie, contact
 *
 *   off: ['about']            → About me vede na 404, odkazy na ni zmizí
 *   off: ['about', 'contact'] → víc stránek najednou
 *   all: true                 → celý web ukazuje jen 404 (např. při předělávce)
 *
 * Tajný náhled pro tebe: přidej k adrese ?nahled  (např. about.html?nahled)
 * a vypnuté stránky uvidíš normálně, dokud nezavřeš prohlížeč.
 * Zrušíš ho přes ?nahled=0.
 */
window.JH_PAGES = {
  off: ['about', 'contact'],
  all: false,
  hideLinks: true, // odkazy na vypnuté stránky zmizí z menu
};

(function () {
  var cfg = window.JH_PAGES;
  var page = (document.currentScript && document.currentScript.dataset.page) || '';
  var isOff = function (name) {
    return name !== '404' && (cfg.all || cfg.off.indexOf(name) !== -1);
  };

  // tajný náhled
  var preview = false;
  try {
    var q = new URLSearchParams(location.search);
    if (q.has('nahled')) {
      if (q.get('nahled') === '0') sessionStorage.removeItem('jh-nahled');
      else sessionStorage.setItem('jh-nahled', '1');
    }
    preview = sessionStorage.getItem('jh-nahled') === '1';
  } catch (e) {}
  if (preview) return;

  // vypnutá stránka → 404
  if (isOff(page)) {
    location.replace('404.html');
    return;
  }

  // odkazy na vypnuté stránky schovat
  if (!cfg.hideLinks) return;
  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href').split(/[?#]/)[0];
      var m = href.match(/^([\w-]+)\.html$/);
      if (m && isOff(m[1])) {
        links[i].classList.add('is-off');
        links[i].setAttribute('aria-hidden', 'true');
        links[i].tabIndex = -1;
      }
    }
  });
})();
