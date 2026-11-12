"""Naplnění data/projects.xlsx projekty ze starého webu (jednorázově)."""
import json, re
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment

ws_ = lambda t: re.sub(r'\s+', ' ', t).strip()
B = 'assets/projects/'
P = [  # id, název, datum, popis, štítky, [(soubor, popisek, odkaz, text odkazu)]
 ('karel', 'Karel 25’', '2025', 'Karel je robotická super ruka.', ['Hardware', 'Software', 'Design', 'UI & UX', 'Code'], [
  ('karel/KAREL_01.mp4', 'Karel je prototyp robotické ruky. Slouží mi jako osobní laboratoř, na které se učím programování, stavbu vlastního hardwaru a základy robotiky. Jde o dlouhodobý pokus vytvořit funkční objekt, který nebude jen technickým cvičením, ale i věcí, která má svébytnou osobnost a radost z používání.'),
  ('karel/KAREL_02.png', 'Projekt navazuje na kultovní vzdělávací hru Karel the Robot z osmdesátých let. Stejně jako původní Karel mě vede k tomu přemýšlet o tom, jak strojům předáváme úkoly a jak s námi mohou sdílet prostor i způsob uvažování.'),
  ('karel/KAREL_03.png', 'Během vývoje se původní návrhy několikrát proměnily. Nešlo jen o nutné mechanické úpravy, ale i o změny vyplývající z toho, jak se postupně vyvíjela samotná představa o tom, k čemu má Karel sloužit a jak s ním budu interagovat.'),
  ('karel/KAREL_04.png', 'Hardware je kompletně navržený na míru a celý řídicí systém píšu v C++. Základem je deska ESP32, která ovládá serva, tlačítka i veškeré LED osvětlení. Celý projekt postupně roste do podoby autonomnějšího, responzivního objektu.'),
  ('karel/KAREL_05.mp4', 'Takhle by měl Karel fungovat ve chvíli, kdy bude dokončený – jako jednoduchý, ale promyšlený robot, ve kterém se spojuje technika, hra a proces učení.'),
 ]),
 ('karel-the-robot', 'Karel the Robot', '2025', 'Remake legendární hry Karel The Robot z 80. let v mém podání. Přeprogramováno do aktuálního trendu webové aplikace a vylepšeného ui a ux a reálným cílem hry.', ['Hardware', 'Software', 'Design', 'UI & UX', 'Code'], [
  ('karel-the-robot/KAREL-GAME_01.mp4', 'Remake legendární hry Karel the Robot vznikl jako webová aplikace, která posouvá původní princip do současnosti. Zatímco osmdesátkový Karel učil základům algoritmizace pomocí jednoduchých příkazů, tahle verze reaguje na dnešní vizuální i interakční standardy.'),
  ('karel-the-robot/KAREL-GAME_02.mp4', 'První prototyp byl složitější a simuloval pohyb celé robotické postavy, podobně jako ve fyzickém projektu Karel. Postupem času jsem ale zvolila jednodušší a čistší variantu – hráč ovládá pouze jeden pohyblivý článek. Umožnilo mi to soustředit se na jádro hry: jasné zadání, čitelný pohyb a přímou vazbu mezi kódem a výsledkem.'),
  ('karel-the-robot/KAREL-GAME_03.png', 'Nalevo je původní Karel z osmdesátých let, napravo první návrhy jeho rekonstrukce. Cílem bylo starý abstrahovaný model převést do vizuálně současné podoby, která respektuje ducha originálu, ale zároveň má charakter, který ladí s dnešní estetiku i technickými možnostmi.'),
  ('karel-the-robot/KAREL-GAME_04.png', ''),
  ('karel-the-robot/KAREL-GAME_05.mp4', '', 'GAMES/KAREL_THE_ROBOT-GAME_main/', 'Zahrát si hru'),
 ]),
 ('mysak', 'Myšák', '2025', 'Robotický dávkovač na bonbonky.', ['Design', 'Print', '3D', 'Hardware', 'Software'], [
  ('mysak/MYSAK_01.png', 'Myšák je malý robot, který dávkuje bonbóny a funguje jako osobní zvířátko na zlepšení nálady.'),
  ('mysak/MYSAK_02.mp4', 'Vznikl ve chvíli, kdy jsem chtěla něco hravého a trochu absurdního – objekt, který existuje jen proto, aby potěšil. Od začátku jsem mířila k podobě drobné, nenápadné myšičky, která se tiše objeví na stole, udělá svou práci a nijak nenarušuje okolí. Takové „cibetkové bonbóny“ převedené do robotické podoby.'),
  ('mysak/MYSAK_03.png', 'Technicky je Myšák velmi jednoduchý: jedno servo, ESP32 naprogramované v C++ a bezdotykové tlačítko, které dává impuls k otevření mechanismu. O to víc práce ale zabral hardware. Mechanika byla největší překážkou – celé dávkování potřebovalo přesný pohyb i spolehlivou konstrukci. Nakonec z toho vyšla vrstvená 3D tištěná schránka, která drží tvar a umožňuje stabilní chod.'),
  ('mysak/MYSAK_04.mp4', 'První verze ukazuje základní design a prototyp mechaniky – ještě bez detailů, spíš hledání tvaru a pohybu.'),
  ('mysak/MYSAK_04.png', 'Druhá verze je už výrazně dál a v paralelním provozu slouží jako zkušební model.'),
  ('mysak/MYSAK_05.glb', 'Prohlédněte si také 3D model. Brzy bude ke stažení a připravený k dalším experimentům.'),
 ]),
 ('zdena', 'Zdena', '2025', '', ['UI & UX'], [
  ('zdena/ZDENA_01.png', ''), ('zdena/ZDENA_02.mp4', ''), ('zdena/ZDENA_03.png', ''), ('zdena/ZDENA_04.png', ''),
 ]),
 ('nos', 'NoS', '2024 – současnost', '', ['UI & UX', 'Code'], [
  ('nos/NOS_01.png', 'Nová Spěška je interní software pro ČEPS určený pro vizualizaci dat. Aplikace musí zobrazovat data efektivně a přehledně, a to jak na velkých obrazovkách, tak na monitorech, tabletech a mobilních zařízeních.'),
  ('nos/NOS_02.png', 'Moje role je grafický design (UI & UX) a kódování některých vizualizací pomocí Deneb/Vega JSON. Momentálně prezentuji ukázku bez reálných dat.'),
  ('nos/NOS_03.png', 'Projekt zajišťuje přehlednou a funkční vizualizaci dat pro interní potřeby ČEPS, podporuje rychlé rozhodování a efektivní monitoring.'),
 ]),
 ('strela', 'Střela', '2025', '', ['Design', 'Print', '3D', 'Hardware', 'Software'], [
  ('strela/STRELA_01.png', ''), ('strela/STRELA_02.png', ''), ('strela/STRELA_03.png', ''),
  ('strela/STRELA_05.glb', 'Brzy appka s AR!!!'),
 ]),
 ('konev', 'Konev', '2025', '', ['Design', 'Print', '3D'], [
  ('konev/KONEV_01.mp4', 'Vstup a výstup je stejný, je to konev, ale musí být konstrukce stejná?'),
  ('konev/KONEV_02.png', ''),
  ('konev/KONEV_03.png', 'Inspirovali mě zamotané špagety je to vlastně výchozí tvar celé konve.'),
  ('konev/KONEV_04.glb', 'Prohlédněte si 3D model. Brzy ke stažení!'),
 ]),
 ('maddona', 'Maddona', '2025', '', ['UI & UX', 'Code'], [
  ('maddona/MADDONA_01.mp4', 'Madona je webová aplikace vytvořená pro kavárnu Černá Madona.'),
  ('maddona/MADDONA_02.mp4', 'Programovala jsem ji v JavaScriptu jako doprovod k 3D objektu navrženému pro prostor kavárny. Jednoduchá geometrie se tu mění v živý ornament a ukazuje, jak může digitální generativní forma rozšiřovat atmosféru místa a jeho vizuální identitu.'),
  ('maddona/MADDONA_03.png', 'Pokračování se nabízí v podobě interaktivních projekcí nebo propojení přímo s objektem v prostoru.'),
  ('maddona/MADDONA_01.png', '', 'https://johanahlavacova3-hue.github.io/Maddonna_DEV/', 'Spustit aplikaci Madona'),
 ]),
 ('gps', 'GPS', '2025', '', ['Design', 'UI & UX', 'Code'], [
  ('gps/GPS_01.mp4', ''), ('gps/GPS_02.mp4', ''), ('gps/GPS_03.png', ''),
  ('gps/GPS_04.mp4', '', 'https://johanahlavacova3-hue.github.io/GPS-dev/', 'Začít objevovat'),
 ]),
]

F = 'Arial'
head_font = Font(name=F, bold=True, color='FFFFFF'); head_fill = PatternFill('solid', fgColor='111111')
cell_font = Font(name=F, size=10); thin = Side(style='thin', color='D9D9D9')
wrap = Alignment(wrap_text=True, vertical='top')

def header(ws, cols, widths, tips):
    ws.append(cols)
    for i, w in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = w
    for c in ws[1]:
        c.font, c.fill, c.alignment = head_font, head_fill, Alignment(vertical='center')
        if c.value in tips:
            c.comment = Comment(tips[c.value], 'Web JH'); c.comment.width = 340; c.comment.height = 130
    ws.row_dimensions[1].height = 22
    ws.freeze_panes = 'A2'

def style(ws, ncols, text_cols=()):
    for r in range(2, max(ws.max_row, 2) + 40):
        for c in range(1, ncols + 1):
            cell = ws.cell(r, c); cell.font = cell_font; cell.alignment = wrap; cell.border = Border(bottom=thin)
            if c in text_cols: cell.number_format = '@'

wb = Workbook()
ws = wb.active; ws.title = 'Práce'
header(ws, ['ID', 'Název', 'Datum', 'Popis', 'Typ (štítky)', 'Skrýt'], [18, 22, 18, 60, 26, 8], {
 'ID': 'Krátký název bez mezer a diakritiky. Musí být stejný jako ve sloupci „Projekt (ID)“ na listu Média.',
 'Datum': 'Text, např. 2025, 12.03.2026 nebo „2024 – současnost“. První rok z data plní výběr „Podle roku“.',
 'Popis': 'Obecný text o práci. Zobrazí se u obrázků, které nemají vlastní popisek na listu Média.',
 'Typ (štítky)': 'Každý štítek na nový řádek (Alt+Enter). Ze štítků vzniká výběr „Podle typu“.',
 'Skrýt': 'Napiš „ano“ a práce se na webu nezobrazí.'})
for pid, title, date, text, tags, _ in P:
    ws.append([pid, title, date, text, '\n'.join(tags), ''])
style(ws, 6, text_cols=(3,))
dv = DataValidation(type='list', formula1='"ano"', allow_blank=True); ws.add_data_validation(dv); dv.add('F2:F500')

wm = wb.create_sheet('Média')
header(wm, ['Projekt (ID)', 'Soubor', 'Popisek', 'Odkaz', 'Text odkazu'], [18, 44, 80, 40, 22], {
 'Projekt (ID)': 'ID práce z listu Práce. Řádky jedné práce dej pod sebe – pořadí řádků = pořadí obrázků na webu.',
 'Soubor': 'Cesta k souboru, např. assets/projects/karel/KAREL_01.mp4\nObrázek: .jpg .png .webp\nVideo: .mp4 (běží samo, bez zvuku, ve smyčce)\n3D: .glb .obj .stl',
 'Popisek': 'Text pod tímto obrázkem. Když je prázdný, zobrazí se Popis celé práce.',
 'Odkaz': 'Nepovinné. Pod textem se objeví odkaz, např. na hru nebo aplikaci.',
 'Text odkazu': 'Text odkazu, např. „Zahrát si hru“. Šipka -> se přidá sama.'})
for pid, *_, media in P:
    for m in media:
        src, cap, link, lt = (list(m) + ['', '', ''])[:4]
        wm.append([pid, B + src, ws_(cap), link, lt])
style(wm, 5)

g = wb.create_sheet('Návod'); g.column_dimensions['A'].width = 110
for t, b in [('Jak přidat práci na web', True),
 ('1. Soubory nahraj do assets/projects/<ID>/ (obrázky, videa .mp4, 3D modely .glb).', False),
 ('2. List „Práce“: jeden řádek = jedna práce. Pořadí řádků = pořadí prací na webu.', False),
 ('3. List „Média“: jeden řádek = jeden obrázek / video / 3D model, s vlastním popiskem. Řádky jedné práce dej pod sebe ve stejném pořadí, v jakém se mají zobrazit.', False),
 ('4. Ulož data/projects.xlsx a nahraj ho na web / do gitu.', False), ('', False),
 ('Popisek u obrázku se zobrazí pod ním; prázdný popisek = zobrazí se Popis celé práce.', False),
 ('Odkaz + Text odkazu přidají pod text odkaz (např. „Zahrát si hru ->“).', False),
 ('Nepřejmenovávej listy ani nadpisy sloupců – web podle nich tabulku čte.', False)]:
    g.append([t]); c = g.cell(g.max_row, 1); c.font = Font(name=F, bold=b, size=12 if b else 10); c.alignment = Alignment(wrap_text=True)
wb.save('data/projects.xlsx')

# záloha ve formátu JSON (stejný obsah)
out = [{'id': pid, 'title': t, 'date': d, 'text': x, 'tags': tg,
        'images': [{'src': B + m[0], 'caption': ws_(m[1]), **({'link': m[2], 'linkText': m[3]} if len(m) > 2 else {})} for m in media]}
       for pid, t, d, x, tg, media in P]
json.dump(out, open('data/projects.json', 'w'), ensure_ascii=False, indent=2)
print(len(P), 'prací,', sum(len(p[5]) for p in P), 'médií')
