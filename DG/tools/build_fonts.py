#!/usr/bin/env python3
"""Vygeneruje js/fonts.js z TTF souborů ve složce fonts/.

Fonty jsou v JS jako base64, protože je potřebuje i export do PDF (jsPDF je vkládá do souboru)
a stránka tak funguje i otevřená přímo z disku (file://), kde fetch na lokální soubory nejde.

Použití (z kořene repozitáře):
    python3 tools/build_fonts.py

Výřez Space Mono se dá znovu vyrobit z plného fontu (fonttools):
    pyftsubset SpaceMono-Regular.ttf \
      --unicodes="U+0020-007E,U+00A0-017F,U+2010-2027,U+2030-205E,U+2190-21FF,U+2202,U+221E,U+2212" \
      --layout-features='*' --output-file=fonts/SpaceMono-Regular-subset.ttf
    pyftsubset DejaVuSansMono.ttf --unicodes="U+0020,U+03B1" --output-file=fonts/DejaVuSansMono-alpha.ttf
"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sm = base64.b64encode((ROOT / "fonts/SpaceMono-Regular-subset.ttf").read_bytes()).decode()
al = base64.b64encode((ROOT / "fonts/DejaVuSansMono-alpha.ttf").read_bytes()).decode()

js = f"""/* Vygenerováno skriptem tools/build_fonts.py – needitovat ručně. */
(function(){{
  var F = window.LP_FONTS = {{
    spaceMono: "{sm}",
    alpha: "{al}"
  }};
  var css =
    '@font-face{{font-family:"SM";src:url(data:font/ttf;base64,' + F.spaceMono + ') format("truetype");font-weight:400;font-style:normal}}' +
    '@font-face{{font-family:"SM";src:url(data:font/ttf;base64,' + F.alpha + ') format("truetype");unicode-range:U+03B1;font-weight:400;font-style:normal}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
}})();
"""
(ROOT / "js/fonts.js").write_text(js, encoding="utf-8")
print("js/fonts.js:", len(js), "B")
