# LP – lineární perspektiva

Interaktivní výkres pro deskriptivní geometrii: židle, stolička nebo stůl v lineární perspektivě.
Objekt se posouvá po základnici z a jeho obraz se počítá přesnou středovou projekcí.
Výsledek se exportuje do PDF (A3 na šířku, okraje 5 mm, tisk 1:1). Objekt je v měřítku 1:7.

Autorka: Johana Hlaváčová

## Spuštění

Bez instalace a bez sestavování. Stačí otevřít `index.html` v prohlížeči, nebo repozitář
nasadit jako statický web (např. GitHub Pages: Settings → Pages → Deploy from branch, složka `/`).

Knihovna jsPDF se načítá z cdnjs, takže export do PDF potřebuje připojení k internetu.

## Struktura

```
index.html            rozvržení (výkres A4, panel, posuvník)
css/style.css         vzhled
js/app.js             geometrie, vykreslení, ovládání, export do PDF
js/fonts.js           fonty jako base64 (generuje tools/build_fonts.py)
fonts/                zdrojové TTF výřezy a licence fontů
tools/build_fonts.py  přegeneruje js/fonts.js z fonts/*.ttf
```

## Jak to počítá

- **Průmětna** je svislá rovina procházející základnicí z. **Střed promítání** S leží ve vzdálenosti d
  před hlavním bodem H a ve výšce vh. Bod P = [x, y, z] (y = hloubka za průmětnou) se zobrazí jako
  `x' = Hx + (x − Hx)·d/(d + y)`, `y' = Hy + (z − vh)·d/(d + y)`.
- **Objekt** se skládá z konvexních dílů. Kvádry tvoří nohy, desky a luby, hranol s obloukem tvoří zaoblenou hlavici židle.
- **Viditelnost hran** se řeší paprskem z oka: hrana se vzorkuje, u každého bodu se testuje, jestli paprsek
  S → bod protne jiný díl, a přechody se zpřesní půlením intervalu. Skryté úseky se kreslí čárkovaně.
- **Podlaha** leží v rovině z = 0 od průmětny do hloubky d. Segmenty ornamentu jsou skládané zrcadlením (p4m): v liché buňce
  se segment zrcadlí podle svislé, v liché řadě podle vodorovné osy. Každý díl objektu zakryje podlahu ve svém průmětu (konvexní obal),
  protože stojí nad ní.
- **Zaoblená plocha** má hrany jen tam, kde je obrysová (stěny po obou stranách hrany míří jedna k oku, druhá od oka).
- **Úběžníky:** U = Hx − d·tg α (hrany do hloubky), U′ = Hx + d·cotg α (hrany do šířky).
  Kontrolu zorného kruhu dělá kružnice o poloměru d/2 kolem H.

## Ovládání

- **Posuvník pod výkresem** nebo **tažení objektu na výkresu** posouvá roh A po základnici, vždy po celých centimetrech listu.
- **Šipky** na posuvníku posouvají o 1 cm, se Shiftem o 5 cm. Šipky nahoru a dolů v polích mění hodnotu.
- **Podlaha** (v sekci TYP): bez podlahy, ornament 1, nebo ornament 2. Číslo vedle je velikost jednoho segmentu dlaždice ve skutečnosti v mm.
- **Číslo listu 01–04** načte zadání z podkladu převedené z A4 (1:10) na A3 (1:7): H[28,5;25,5], vh = 15,5, d = 45, α = 30°; list 04 H[32,5;25,5], α = 35°.
- **Dimenze** jsou skutečné rozměry v mm a **konstanty** jsou parametry zadání v cm na listu. Výchozí měřítko je 1:7.

## List

A3 na šířku (420 × 297 mm), rám 5 mm od okraje, razítko 13 mm. Mřížka má dílek 2,5 mm a každá čtvrtá čára (1 cm) je tmavší.
Tloušťky čar jsou o krok řady √2 silnější než pro A4: viditelné hrany 0,5 mm, neviditelné 0,25 mm, pomocné 0,18 mm.

## Licence fontů

- Space Mono: SIL Open Font License 1.1 (`fonts/OFL-SpaceMono.txt`)
- DejaVu Sans Mono (pouze znak α): Bitstream Vera / DejaVu licence (`fonts/LICENSE-DejaVu.txt`)
