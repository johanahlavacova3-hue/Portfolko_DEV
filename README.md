# jhlavacova.cz — portfolio

Statický web (HTML + CSS + JS, bez buildu). 3D logo JH běží na [Three.js](https://threejs.org), které se načítá z CDN.

```
.
├── index.html          úvod
├── about.html          About me
├── portfolio.html      výběr prací: 3D „portfolio“ + podle roku / podle typu
├── galerie.html        galerie prací (jedna obrazovka, swipe), umí filtr ?rok= / ?typ=
├── contact.html        Call me: telefon, e-mail, fakturační údaje
├── model.html          náhled 3D modelů přes celou obrazovku
├── 404.html            „Rozbila jsem to. Pardon …“
├── css/style.css       všechny styly
├── js/
│   ├── config.js       ⚙️  nastavení: 3D model, zdroj projektů
│   ├── pages.js        ⚙️  vypínání stránek (→ 404)
│   ├── main.js         kontakty, About me, úvodní animace
│   ├── portfolio.js    galerie: přechody, swipe, kurzor, klávesy, filtr
│   ├── media.js        obrázky, videa a 3D modely v galerii
│   ├── selection.js    výběr prací podle roku a typu
│   ├── motion.js       sdílené animace (maskované texty, easing)
│   ├── jh3d.js         3D logo reagující na myš
│   └── data.js         načítání JSON / CSV / Google Sheets
├── data/
│   ├── projects.xlsx   ✏️  práce do portfolia (Excel, list „Práce“)
│   ├── projects.json   záloha / alternativa k Excelu
│   └── site.json       ✏️  kontakty, IČO, texty About me
└── assets/
    ├── logo.svg, favicon.svg
    ├── models/         sem patří 3D model JH (.glb)
    └── projects/<id>/  obrázky, videa a 3D modely k jednotlivým pracím
```

## Spuštění lokálně

Web načítá data přes `fetch`, takže **nejde otevřít dvojklikem** (`file://`). Potřebuje malý server:

```bash
npx serve .            # nebo
python3 -m http.server
```

Případně ve VS Code rozšíření **Live Server** → „Go Live“.

## Vypnutí stránky (404)

V `js/pages.js` vypiš stránky, které mají být vypnuté:

```js
off: ['about', 'contact'],   // názvy: index, about, portfolio, galerie, contact
all: false,                  // true = celý web ukazuje jen 404
```

Vypnutá stránka hned přesměruje na `404.html` a odkazy na ni zmizí (v horním menu zůstane prázdné místo, aby se nerozhodilo rozložení).
**Tajný náhled:** přidej k adrese `?nahled` (např. `about.html?nahled`) a vypnuté stránky uvidíš normálně, dokud nezavřeš prohlížeč. Zrušíš přes `?nahled=0`.

## Portfolio – výběr

`portfolio.html` ukazuje složený 3D nápis „portfolio“ a pod ním výběr **podle roku** i **podle typu**. Obojí se počítá automaticky z `data/projects.json`:
- **rok** = pole `year`, nebo poslední čtyřčíslí z `date` (12.05.2026 → 2026),
- **typ** = štítky v `tags`.

Odkaz vede do galerie jen s vybranými pracemi (`galerie.html?rok=2026`, `galerie.html?typ=robotika`). „Všechno ->“ ukáže všechny.
Až se rozhodneš pro jeden způsob, stačí v `portfolio.html` smazat druhý sloupec (`data-select="year"` nebo `data-select="tag"`).

## Call me

`contact.html` má velké telefonní číslo a e-mail a fakturační údaje. Všechno se bere z `data/site.json` (`phone`, `email`, `ico`, volitelně `address`, který se zobrazí jen když je vyplněný).
Na počítači klik na číslo zkopíruje ho do schránky, na mobilu rovnou vytáčí.

## Galerie – ovládání

Obrázek nahoře se přepíná, texty na černé ploše pod ním zůstávají na místě. Žádná tlačítka:

| akce | další / předchozí obrázek | skok na další / předchozí práci |
|---|---|---|
| myš | klik do pravé / levé půlky, tažení do strany | kolečko |
| touchpad | vodorovné gesto | svislé gesto |
| mobil | swipe do strany | (plynule navazuje za posledním obrázkem) |
| klávesnice | ← → | ↑ ↓ |

Za posledním obrázkem práce plynule navazuje další práce. Kurzor nad obrázkem ukazuje pořadí a směr (`02/03 ->`).
Odkaz na konkrétní obrázek: `galerie.html#nazev-prace/2`.
Přechody jsou jemné: prolnutí s malým posunem a zoomem. Mezi obrázky jedné práce nejmenší, při přechodu na jinou práci o kousek výraznější. Sílu nastavíš v `js/config.js` → `gallery`.
Texty (v galerii i nadpisy a menu na stránkách) naskakují po písmenech a **pokaždé jinou animací** – zespodu, shora, rozostřeně, psacím strojem, v náhodném pořadí, z náklonu nebo „dopočítáním“ náhodných znaků. Varianty jsou v `js/motion.js` (`LETTER_FX`), dvě stejné nikdy nejdou po sobě.

## Přidání nové práce

1. Nahraj soubory do `assets/projects/<ID>/` (např. `01.jpg`, `02.mp4`, `03.obj`).
2. Otevři `data/projects.xlsx` v Excelu a na listu **Práce** přidej řádek. Pořadí řádků = pořadí na webu.
3. Ulož a nahraj na web / do gitu. Nic dalšího není potřeba.

| sloupec | co tam patří |
|---|---|
| ID | krátký název bez mezer a diakritiky (nepovinné, jinak se vytvoří z názvu) |
| Název | název práce |
| Datum | `DD.MM.RRRR`; rok z data plní výběr „Podle roku“ |
| Popis | text pod obrázkem, sám se rozdělí do dvou sloupců; nový řádek Alt+Enter |
| Typ (štítky) | každý štítek na nový řádek (Alt+Enter) nebo oddělený `;`; plní výběr „Podle typu“ |
| Obrázky / videa / 3D | cesty k souborům, každý na nový řádek; ideální poměr stran cca 2,5 : 1 |
| Skrýt | `ano` = práce se nezobrazí |

### Typy souborů v galerii
Galerie pozná typ podle přípony:

| typ | přípony | jak se chová |
|---|---|---|
| obrázek | `.jpg .png .webp .gif .avif` | jako dřív |
| video | `.mp4 .webm .mov` | běží samo, bez zvuku, ve smyčce; ideálně H.264 MP4 s „faststart“ |
| 3D model | `.obj .glb .gltf .stl` | pomalu se otáčí a natáčí za myší, sám se vycentruje |

U `.obj` se automaticky načte stejnojmenný `.mtl` (např. `03.obj` + `03.mtl`) i textury, na které odkazuje – stačí je dát do stejné složky. Bez `.mtl` dostane model hliněný materiál jako 3D logo.
Velké modely zmenšíš převodem na `.glb` (Blender → Export → glTF Binary), načítá se rychleji než `.obj`.

Nadpisy sloupců mají v Excelu nápovědu (komentář) a list **Návod** shrnuje totéž.
Nepřejmenovávej list ani nadpisy – web podle nich tabulku čte.

Jiné zdroje (nastavíš `projectsSource` v `js/config.js`): `data/projects.json`, nebo Google Sheets publikovaný jako CSV (*Soubor → Sdílet → Publikovat na webu → CSV*), se stejnými nadpisy sloupců.

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
