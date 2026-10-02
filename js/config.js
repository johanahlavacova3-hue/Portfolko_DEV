/**
 * Globální nastavení webu. Tady se mění zdroje dat a 3D model.
 */
export const CONFIG = {
  /**
   * Výchozí 3D model (About me, 404).
   * - null  → vykreslí se zástupné JH poskládané z „diamantů“ (placeholder)
   * - cesta → načte se tvůj model, např. 'assets/models/jh.glb' (formát .glb / .gltf)
   * Jednotlivá stránka to může přebít atributem data-model="…" na .stage
   * (úvod má data-model="assets/models/jh026.glb").
   */
  model: {
    url: null,
    // doladění po načtení vlastního modelu:
    rotation: [0, 0, 0], // radiány [x, y, z]
    scale: 1,            // násobek automatického přizpůsobení velikosti
  },

  /** Jak moc se JH natáčí za myší (radiány). */
  tilt: { x: 0.28, y: 0.45 },

  /**
   * Odkud se berou projekty v portfoliu:
   *  - 'data/projects.json'  (výchozí)
   *  - 'data/projects.csv'   (export z Excelu / tabulky)
   *  - odkaz na Google Sheets publikovaný jako CSV:
   *    'https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv'
   */
  projectsSource: 'data/projects.json',

  /** Kontakty a texty „About me“. */
  siteSource: 'data/site.json',
};
