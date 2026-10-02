# jhlavacova.cz — portfolio

Statický web (HTML + CSS + JS, bez buildu). 3D logo JH běží na [Three.js](https://threejs.org), které se načítá z CDN.

```
.
├── index.html          úvod
├── about.html          About me
├── portfolio.html      galerie prací (jedna obrazovka, swipe)
├── 404.html            „Rozbila jsem to. Pardon …“
├── css/style.css       všechny styly
├── js/
│   ├── config.js       ⚙️  nastavení: 3D model, zdroj projektů
│   ├── main.js         kontakty, About me, úvodní animace
│   ├── portfolio.js    galerie: přechody, swipe, kurzor, klávesy
│   ├── motion.js       sdílené animace (maskované texty, easing)
│   ├── jh3d.js         3D logo reagující na myš
│   └── data.js         načítání JSON / CSV / Google Sheets
├── data/
│   ├── projects.json   ✏️  práce do portfolia
│   ├── projects.csv    ✏️  totéž jako tabulka (alternativa)
│   └── site.json       ✏️  kontakty, IČO, texty About me
└── assets/
    ├── logo.svg, favicon.svg
    ├── models/         sem patří 3D model JH (.glb)
    └── projects/<id>/  obrázky k jednotlivým pracím
```

## Spuštění lokálně

Web načítá data přes `fetch`, takže **nejde otevřít dvojklikem** (`file://`). Potřebuje malý server:

```bash
npx serve .            # nebo
python3 -m http.server
```

Případně ve VS Code rozšíření **Live Server** → „Go Live“.

## Portfolio – ovládání

Obrázek nahoře se přepíná, texty na černé ploše pod ním zůstávají na místě. Žádná tlačítka:

| akce | další / předchozí obrázek | skok na další / předchozí práci |
|---|---|---|
| myš | klik do pravé / levé půlky, tažení do strany | kolečko |
| touchpad | vodorovné gesto | svislé gesto |
| mobil | swipe do strany | (plynule navazuje za posledním obrázkem) |
| klávesnice | ← → | ↑ ↓ |

Za posledním obrázkem práce plynule navazuje další práce. Kurzor nad obrázkem ukazuje pořadí a směr (`02/03 ->`).
Odkaz na konkrétní obrázek: `portfolio.html#nazev-prace/2`.
Rychlost a křivky animací se ladí v `js/motion.js` a na začátku `js/portfolio.js` (`DUR`).

## Přidání nové práce

### Varianta A: JSON (výchozí)
1. Nahraj obrázky do `assets/projects/nazev-prace/` (např. `01.jpg`, `02.jpg`).
2. Do `data/projects.json` přidej záznam. Pořadí v souboru = pořadí na webu.

```json
{
  "id": "nazev-prace",
  "title": "Název projektu",
  "date": "12.05.2026",
  "text": "Popis projektu…",
  "tags": ["UI & UX design", "Robotika"],
  "images": ["assets/projects/nazev-prace/01.jpg", "assets/projects/nazev-prace/02.jpg"]
}
```

- `images`: libovolný počet. Ideálně stejný poměr stran (cca 2,5 : 1), jinak se ořízne na výšku rámu.
- `text`: sám se rozdělí po řádcích do dvou sloupců. Nový řádek zapíšeš jako `\n`.

### Varianta B: tabulka (Excel / CSV)
V `js/config.js` nastav `projectsSource: 'data/projects.csv'` a upravuj `data/projects.csv` v Excelu.
Sloupce: `id, title, date, text, tags, images, hidden`.
Více štítků nebo obrázků odděl středníkem `;`. Když do `hidden` napíšeš `x`, práce se skryje.

### Varianta C: Google Sheets (bez sahání do gitu)
1. Vytvoř tabulku se stejnými sloupci jako v CSV.
2. *Soubor → Sdílet → Publikovat na webu* → list → formát **CSV** → zkopíruj odkaz.
3. V `js/config.js` nastav `projectsSource: '<ten odkaz>'`.

Pak stačí upravit tabulku a web se změní sám. Obrázky můžou být v gitu (`assets/...`) nebo jako plné URL.

## 3D model

Na úvodu je `assets/models/jh026.glb` (nápis „.jH·026“), vygenerovaný 1:1 z PNG, na 404 je `assets/models/404.glb` ve stejném písmu. About me zatím ukazuje zástupné JH.
Zdrojová PNG jsou v `assets/source/`. „404“ skládá `tools/make404.py` přímo z dílů původního nápisu (nula beze změny, čtyřka = H s levým sloupcem do 3. řádku), takže měřítko sedí 1:1.
Každá stránka si model vybírá atributem `data-model` na prvku `.stage` (např. `data-model="assets/models/jh026.glb"`, nebo `none` pro zástupné JH). Bez atributu platí `model.url` z `js/config.js`.
Díly mají čtvercový půdorys (hloubka = šířka) a kde se dotýkají, plynule se spojí. Po načtení stránky se nápis poskládá: díly přiletí zleva doprava a spojí se.
Každý samostatný kus je vlastní objekt: celý nápis se natáčí za myší, díl pod kurzorem se roztočí a na 404 se díly rozutíkají.
Samotné modely si prohlédneš přes celou obrazovku: `model.html` (.jH·026), `model.html#404`, `model.html#portfolio`.

### Diamantové písmo (`tools/diamond_font.py`)
Skládá nové nápisy z dílů původního .jH·026 (sloupce spojených diamantů + samostatné diamanty), takže tvar i měřítko sedí 1:1.
Umí zatím písmena `p o r t f l i` a číslice `0 4`. Další písmena se přidají do slovníku `GLYPHS`.

```bash
python3 tools/diamond_font.py portfolio assets/source/portfolio.png --scatter 1.15 --seed 5   # rozházené
python3 tools/diamond_font.py 404 assets/source/404b.png                                     # na účaří
python3 tools/png2glb.py assets/source/portfolio.png model-raw.glb
npx @gltf-transform/cli meshopt model-raw.glb assets/models/portfolio.glb
```

`--scatter` určuje, jak moc jsou písmena rozházená (0 = na účaří), `--seed` vybírá jiné náhodné rozložení.

### Z PNG na 3D (skript `tools/png2glb.py`)
PNG musí mít bílé tvary na průhledném pozadí (nebo na černém).

```bash
pip install numpy scipy pillow trimesh
python3 tools/png2glb.py muj-napis.png model-raw.glb --step 6 --depth 1.0
npx @gltf-transform/cli meshopt model-raw.glb assets/models/muj-napis.glb   # zmenší soubor cca 6×
```

- `--step`: hustota sítě (menší = jemnější a větší soubor)
- `--depth`: hloubka vůči šířce (1 = čtvercový půdorys)
- `--noise`: hliněná nerovnost povrchu

### Vlastní model z Blenderu
Vyexportuj **glTF Binary (.glb)**, ulož ho do `assets/models/` a v `js/config.js` nastav:

```js
model: { url: 'assets/models/jh.glb', rotation: [0, 0, 0], scale: 1 },
```

Model se sám vycentruje a přizpůsobí velikosti. Pokud má víc samostatných objektů, reaguje každý na myš zvlášť (vypneš to přes `interactiveParts: false`).
Když nastavíš `url: null`, zobrazí se zástupné JH z diamantů.

## Nasazení

- **GitHub Pages:** *Settings → Pages → Deploy from branch → main / root*. Soubor `.nojekyll` už v repozitáři je a `404.html` se použije automaticky.
- **Netlify / Vercel / Cloudflare Pages:** stačí nahrát složku, nic se nesestavuje.
