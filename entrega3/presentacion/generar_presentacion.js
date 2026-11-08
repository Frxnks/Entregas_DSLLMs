const pptxgen = require('pptxgenjs');
const path = require('path');
process.env.NODE_PATH = path.join(__dirname, 'node_modules');
require('module').Module._initPaths();

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Equipo MIRA — Lagos, Moraga, Chaves y Caru';
pptx.company = 'Equipo MIRA';
pptx.subject = 'Entrega 3 — Asistente RAG + MCP para CU-1';
pptx.title = 'MIRA Entrega 3';
pptx.lang = 'es-CL';
pptx.theme = { headFontFace: 'Cambria', bodyFontFace: 'Arial', lang: 'es-CL' };
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';

const C = { background1: 'F4F7F9', text1: '102A38', text2: '60757F', accent2: '70C8B5' };
const HEX = { navy: '102A38', teal: '0D7C78', mint: 'DDF3EF', sea: '70C8B5', gold: 'E8B44F', coral: 'F16C5B', ink: '24343D', muted: '60757F', light: 'F4F7F9', white: 'FFFFFF', line: 'CEDBE0' };
const OUT = path.join(__dirname, 'Presentacion_Entrega_3_MIRA.pptx');

const noLine = { color: HEX.white, transparency: 100 };
const shadow = () => ({ type: 'outer', color: HEX.navy, opacity: 0.12, blur: 2, angle: 45, distance: 1 });
const tx = (slide, text, options) => slide.addText(text, { isTextBox: true, margin: 0, breakLine: false, ...options });
const rect = (slide, x, y, w, h, fill, radius = 0.12, line = noLine) => slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line, shadow: shadow() });
const circle = (slide, label, x, y, color, size = 0.46) => {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w: size, h: size, fill: { color }, line: noLine });
  tx(slide, label, { x, y: y + 0.07, w: size, h: 0.2, fontFace: 'Arial', fontSize: 12, bold: true, color: HEX.white, align: 'center' });
};
const pill = (slide, text, x, y, w, fill, color = HEX.white) => {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.4, rectRadius: 0.18, fill: { color: fill }, line: noLine });
  tx(slide, text, { x, y: y + 0.105, w, h: 0.18, fontSize: 11, bold: true, color, align: 'center' });
};
const footer = [
  { text: 'MIRA · Entrega 3 · CU-1', options: { x: 0.72, y: 7.12, w: 3.4, h: 0.18, fontFace: 'Arial', fontSize: 9, color: C.text2, margin: 0 } },
  { text: 'v3.0', options: { x: 11.95, y: 7.12, w: 0.55, h: 0.18, fontFace: 'Arial', fontSize: 9, color: C.text2, align: 'right', margin: 0 } },
  { slideNumber: { x: 12.55, y: 7.11, w: 0.25, h: 0.18, fontFace: 'Arial', fontSize: 9, color: C.text2, align: 'right', margin: 0 } },
];

pptx.defineSlideMaster({
  title: 'MIRA_LIGHT', background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.72, y: 0.42, w: 11.9, h: 0.55, fontFace: 'Cambria', fontSize: 29, bold: true, color: C.text1, margin: 0 }, text: '' } },
    ...footer,
  ], slideNumber: { x: 12.55, y: 7.11, w: 0.25, h: 0.18, color: C.text2, fontSize: 9 },
});
pptx.defineSlideMaster({
  title: 'MIRA_DARK', background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.72, y: 0.52, w: 11.9, h: 0.62, fontFace: 'Cambria', fontSize: 31, bold: true, color: C.background1, margin: 0 }, text: '' } },
    { text: 'MIRA · Entrega 3 · CU-1', options: { x: 0.72, y: 7.12, w: 3.4, h: 0.18, fontFace: 'Arial', fontSize: 9, color: C.accent2, margin: 0 } },
    { text: 'v3.0', options: { x: 11.95, y: 7.12, w: 0.55, h: 0.18, fontFace: 'Arial', fontSize: 9, color: C.accent2, align: 'right', margin: 0 } },
  ], slideNumber: { x: 12.55, y: 7.11, w: 0.25, h: 0.18, color: C.accent2, fontSize: 9 },
});

function lightSlide(title, section) {
  const slide = pptx.addSlide({ masterName: 'MIRA_LIGHT', sectionTitle: section });
  slide.addText(title, { placeholder: 'title' });
  return slide;
}
function darkSlide(title, section) {
  const slide = pptx.addSlide({ masterName: 'MIRA_DARK', sectionTitle: section });
  slide.addText(title, { placeholder: 'title' });
  return slide;
}

pptx.addSection({ title: 'Apertura' });
{
  const s = darkSlide('MIRA — Entrega 3', 'Apertura');
  tx(s, 'Asistente RAG + MCP para el operador de revisión', { x: 0.75, y: 1.42, w: 8.8, h: 0.55, fontFace: 'Arial', fontSize: 25, color: HEX.sea });
  tx(s, 'CU-1 · explicar con evidencia · consultar con permisos · actuar con confirmación', { x: 0.75, y: 2.12, w: 10.6, h: 0.34, fontSize: 16, color: HEX.white });
  const stats = [
    ['6', 'documentos versionados'], ['20', 'preguntas Golden Set'], ['25', 'pruebas aprobadas'], ['0,90', 'Recall@5 evidencia'],
  ];
  stats.forEach((v, i) => {
    rect(s, 0.76 + i * 3.05, 3.06, 2.65, 1.34, i === 3 ? HEX.teal : '183D4F');
    tx(s, v[0], { x: 0.95 + i * 3.05, y: 3.25, w: 2.25, h: 0.5, fontSize: 31, bold: true, color: i === 3 ? HEX.white : HEX.gold, align: 'center' });
    tx(s, v[1], { x: 0.95 + i * 3.05, y: 3.83, w: 2.25, h: 0.24, fontSize: 12, color: HEX.white, align: 'center' });
  });
  pill(s, 'La decisión sigue siendo humana', 3.98, 5.05, 5.35, HEX.coral);
  tx(s, 'Lagos · Moraga · Chaves · Caru  |  9 de noviembre de 2026', { x: 0.78, y: 6.32, w: 8.6, h: 0.22, fontSize: 11, color: HEX.sea });
  s.addNotes('Abrir con el objetivo: el asistente explica y prepara acciones, pero no decide. Presentar las cuatro cifras como resultados ya comprobados.');
}

{
  const s = lightSlide('El problema: explicar sin convertir al modelo en juez', 'Apertura');
  const cards = [
    { x: 0.75, n: '1', title: 'Caso operativo', body: 'Puntaje, señales y evidencias viven en datos transaccionales.', color: HEX.navy },
    { x: 3.85, n: '2', title: 'Reglas versionadas', body: 'Hay vigencias, versiones derogadas y un conflicto 80/85.', color: HEX.teal },
    { x: 6.95, n: '3', title: 'Acción sensible', body: 'Solicitar antecedentes cambia el estado y exige autorización.', color: HEX.gold },
    { x: 10.05, n: '4', title: 'Decisión humana', body: 'El operador conserva el control y la responsabilidad final.', color: HEX.coral },
  ];
  cards.forEach(c => {
    rect(s, c.x, 1.55, 2.55, 3.45, HEX.white, 0.14, { color: HEX.line, width: 1 });
    circle(s, c.n, c.x + 0.22, 1.78, c.color, 0.58);
    tx(s, c.title, { x: c.x + 0.22, y: 2.58, w: 2.08, h: 0.52, fontFace: 'Cambria', fontSize: 20, bold: true, color: HEX.navy });
    tx(s, c.body, { x: c.x + 0.22, y: 3.35, w: 2.08, h: 1.05, fontSize: 14, color: HEX.ink, breakLine: false, valign: 'mid' });
  });
  s.addShape(pptx.ShapeType.chevron, { x: 5.85, y: 5.55, w: 1.65, h: 0.55, fill: { color: HEX.teal }, line: noLine });
  tx(s, 'RAG aporta evidencia; MCP aporta gobierno', { x: 3.45, y: 6.25, w: 6.45, h: 0.35, fontSize: 20, bold: true, color: HEX.teal, align: 'center' });
  s.addNotes('Explicar que el problema no es solo responder preguntas. Debemos combinar conocimiento documental, datos autorizados y una escritura segura.');
}

pptx.addSection({ title: 'Diseño' });
{
  const s = lightSlide('Arquitectura: un solo camino autorizado hacia los datos', 'Diseño');
  const node = (x, y, w, label, sub, fill) => {
    rect(s, x, y, w, 0.95, fill, 0.12, { color: fill === HEX.white ? HEX.line : fill, width: 1 });
    tx(s, label, { x: x + 0.12, y: y + 0.16, w: w - 0.24, h: 0.25, fontSize: 17, bold: true, color: fill === HEX.white ? HEX.navy : HEX.white, align: 'center' });
    tx(s, sub, { x: x + 0.12, y: y + 0.55, w: w - 0.24, h: 0.17, fontSize: 10.5, color: fill === HEX.white ? HEX.muted : HEX.white, align: 'center' });
  };
  node(0.76, 1.52, 2.1, 'Next.js', '/asistente', HEX.navy);
  node(3.38, 1.52, 2.1, 'FastAPI', 'sesión y coordinación', HEX.teal);
  node(6.00, 1.52, 2.1, 'Gemini', 'selección de herramientas', HEX.gold);
  node(8.62, 1.52, 2.1, 'FastMCP', 'permisos y contratos', HEX.coral);
  [[2.87,3.33],[5.49,5.95],[8.11,8.57]].forEach(v => s.addShape(pptx.ShapeType.chevron, { x: v[0], y: 1.77, w: 0.36, h: 0.35, fill: { color: HEX.muted }, line: noLine }));
  s.addShape(pptx.ShapeType.line, { x: 9.67, y: 2.5, w: 0, h: 1.0, line: { color: HEX.coral, width: 2, beginArrowType: 'none', endArrowType: 'triangle' } });
  s.addShape(pptx.ShapeType.line, { x: 9.67, y: 3.48, w: -2.1, h: 0.72, line: { color: HEX.teal, width: 2, endArrowType: 'triangle' } });
  s.addShape(pptx.ShapeType.line, { x: 9.67, y: 3.48, w: 2.1, h: 0.72, line: { color: HEX.coral, width: 2, endArrowType: 'triangle' } });
  node(5.90, 4.18, 3.15, 'Motor RAG', 'indexación y consulta separadas', HEX.teal);
  node(10.30, 4.18, 2.25, 'SQLite', 'datos operacionales', HEX.coral);
  node(5.90, 5.55, 3.15, 'ChromaDB', 'fragmentos + vectores', HEX.white);
  s.addShape(pptx.ShapeType.line, { x: 7.48, y: 5.14, w: 0, h: 0.38, line: { color: HEX.teal, width: 2, endArrowType: 'triangle' } });
  rect(s, 0.78, 4.05, 4.15, 1.86, HEX.mint, 0.14, { color: HEX.sea, width: 1 });
  tx(s, 'Separación comprobable', { x: 1.03, y: 4.35, w: 3.65, h: 0.3, fontSize: 20, bold: true, color: HEX.navy });
  tx(s, 'La API no importa SQLite. Toda lectura o escritura operacional pasa por MCP. RAG puede evaluarse sin MCP ni Gemini.', { x: 1.03, y: 4.95, w: 3.65, h: 0.65, fontSize: 14, color: HEX.ink });
  s.addNotes('Defender el reparto: ChromaDB contiene conocimiento estático; SQLite contiene estado operacional. MCP es el límite de confianza.');
}

{
  const s = lightSlide('RAG: mejora con k=5; persisten dos preguntas incompletas', 'Diseño');
  s.addChart(pptx.ChartType.bar, [
    { name: 'Recall por evidencia', labels: ['Secciones', 'Ventanas'], values: [90, 90] },
    { name: 'Preguntas completas', labels: ['Secciones', 'Ventanas'], values: [87.5, 87.5] },
  ], {
    x: 0.72, y: 1.45, w: 7.25, h: 4.65, catAxisLabelFontFace: '+mn-lt', catAxisLabelFontSize: 13,
    valAxisLabelFontFace: '+mn-lt', valAxisLabelFontSize: 11, valAxisMinVal: 0, valAxisMaxVal: 100,
    valAxisMajorUnit: 20, showLegend: true, legendPos: 'b', legendFontFace: '+mn-lt', legendFontSize: 11,
    showValue: true, dataLabelPosition: 'inEnd', dataLabelColor: HEX.white, dataLabelFormatCode: '0.00"%"',
    chartColors: [HEX.teal, HEX.navy], showTitle: false,
    showCatName: false, showValAxisTitle: false, showCatAxisTitle: false,
    valGridLine: { color: HEX.line, size: 1 }, catGridLine: { style: 'none' },
    border: { color: HEX.white, transparency: 100 },
  });
  const failureCards = [
    ['Secciones', '35 fragmentos', 'C01 y V02', 'cada una recupera 1 de 2 evidencias', HEX.navy],
    ['Ventanas', '40 fragmentos', 'C01 y V02', 'cada una recupera 1 de 2 evidencias', HEX.teal],
  ];
  failureCards.forEach((c, i) => {
    rect(s, 8.45, 1.52 + i * 2.15, 4.12, 1.72, i === 0 ? HEX.light : HEX.mint, 0.14, { color: i === 0 ? HEX.line : HEX.sea, width: 1 });
    pill(s, c[0], 8.72, 1.76 + i * 2.15, 1.35, c[4]);
    tx(s, c[1], { x: 10.25, y: 1.84 + i * 2.15, w: 1.95, h: 0.2, fontSize: 12, color: HEX.muted, align: 'right' });
    tx(s, c[2], { x: 8.72, y: 2.38 + i * 2.15, w: 1.6, h: 0.25, fontSize: 16, bold: true, color: c[4] });
    tx(s, c[3], { x: 10.15, y: 2.28 + i * 2.15, w: 2.05, h: 0.55, fontSize: 12.5, color: HEX.ink, valign: 'mid' });
  });
  pill(s, 'Predeterminada: secciones completas', 8.58, 6.02, 3.86, HEX.coral);
  tx(s, 'Ambas estrategias empatan; secciones conserva reglas completas.', { x: 8.62, y: 6.55, w: 3.78, h: 0.3, fontSize: 12.5, color: HEX.muted, align: 'center' });
  s.addNotes('Con k=5, ambas estrategias obtienen Recall 0,90 por evidencia y 0,875 por pregunta. Ambas recuperan R05 y las dos fuentes de C02; C01 y V02 siguen incompletas. Secciones se mantiene por conservar las condiciones completas de cada regla.');
}

{
  const s = darkSlide('MCP: siete puertas antes de una escritura', 'Diseño');
  const gates = [
    ['1', 'Sesión'], ['2', 'Organización'], ['3', 'Rol'], ['4', 'Estado'], ['5', 'Límite'], ['6', 'Contenido'], ['7', 'Confirmación'],
  ];
  gates.forEach((g, i) => {
    const x = 0.74 + i * 1.77;
    circle(s, g[0], x + 0.47, 1.68, i < 6 ? HEX.teal : HEX.coral, 0.58);
    rect(s, x, 2.45, 1.5, 0.72, '183D4F', 0.12, { color: '2E5A6B', width: 1 });
    tx(s, g[1], { x: x + 0.08, y: 2.68, w: 1.34, h: 0.2, fontSize: 12.5, bold: true, color: HEX.white, align: 'center' });
    if (i < 6) s.addShape(pptx.ShapeType.chevron, { x: x + 1.52, y: 2.62, w: 0.22, h: 0.32, fill: { color: HEX.sea }, line: noLine });
  });
  rect(s, 1.10, 4.08, 3.3, 1.38, '183D4F', 0.14, { color: '2E5A6B', width: 1 });
  tx(s, 'Bloqueos demostrables', { x: 1.35, y: 4.35, w: 2.8, h: 0.28, fontSize: 19, bold: true, color: HEX.gold, align: 'center' });
  tx(s, 'U-03 · C-010 · tercera solicitud de C-016', { x: 1.35, y: 4.88, w: 2.8, h: 0.25, fontSize: 13, color: HEX.white, align: 'center' });
  rect(s, 5.02, 4.08, 3.3, 1.38, '183D4F', 0.14, { color: '2E5A6B', width: 1 });
  tx(s, 'Transacción atómica', { x: 5.27, y: 4.35, w: 2.8, h: 0.28, fontSize: 19, bold: true, color: HEX.gold, align: 'center' });
  tx(s, 'Solicitud + evento + callback simulado', { x: 5.27, y: 4.88, w: 2.8, h: 0.25, fontSize: 13, color: HEX.white, align: 'center' });
  rect(s, 8.94, 4.08, 3.3, 1.38, '183D4F', 0.14, { color: '2E5A6B', width: 1 });
  tx(s, 'Idempotencia', { x: 9.19, y: 4.35, w: 2.8, h: 0.28, fontSize: 19, bold: true, color: HEX.gold, align: 'center' });
  tx(s, 'El mismo token devuelve el mismo resultado', { x: 9.19, y: 4.82, w: 2.8, h: 0.43, fontSize: 13, color: HEX.white, align: 'center' });
  pill(s, 'La consulta nunca cambia el estado', 3.95, 6.18, 5.45, HEX.coral);
  s.addNotes('Recorrer las siete validaciones. Destacar que la confirmación no evita revalidar: todo se vuelve a comprobar dentro de BEGIN IMMEDIATE.');
}

pptx.addSection({ title: 'Evidencia' });
{
  const s = lightSlide('Privacidad: minimización antes de cada llamada externa', 'Evidencia');
  rect(s, 0.78, 1.48, 5.55, 4.72, HEX.mint, 0.14, { color: HEX.sea, width: 1 });
  circle(s, '✓', 1.12, 1.82, HEX.teal, 0.62);
  tx(s, 'Puede viajar a Gemini', { x: 1.95, y: 1.88, w: 3.8, h: 0.35, fontSize: 22, bold: true, color: HEX.navy });
  const yes = [
    ['Reglas', 'fragmento + código + sección + versión'],
    ['Caso', 'ID ficticio + estado + puntaje + motivo'],
    ['Señales', 'código + valor + mínimo necesario'],
    ['Evidencia', 'solo extracto sanitizado'],
  ];
  yes.forEach((v, i) => {
    circle(s, String(i + 1), 1.18, 2.65 + i * 0.72, HEX.teal, 0.38);
    tx(s, v[0], { x: 1.72, y: 2.65 + i * 0.72, w: 1.0, h: 0.2, fontSize: 14, bold: true, color: HEX.teal });
    tx(s, v[1], { x: 2.65, y: 2.63 + i * 0.72, w: 3.12, h: 0.32, fontSize: 12.5, color: HEX.ink });
  });
  rect(s, 6.98, 1.48, 5.55, 4.72, HEX.light, 0.14, { color: HEX.line, width: 1 });
  circle(s, '×', 7.32, 1.82, HEX.coral, 0.62);
  tx(s, 'Nunca debe viajar', { x: 8.15, y: 1.88, w: 3.8, h: 0.35, fontSize: 22, bold: true, color: HEX.navy });
  const no = ['nombres de usuarios', 'RUT, correo y teléfono', 'credenciales y API keys', 'rutas locales y session_id'];
  no.forEach((v, i) => {
    circle(s, '×', 7.38, 2.65 + i * 0.72, HEX.coral, 0.38);
    tx(s, v, { x: 7.92, y: 2.65 + i * 0.72, w: 3.95, h: 0.25, fontSize: 13.5, color: HEX.ink });
  });
  pill(s, 'Reducción de exposición ≠ anonimización universal', 3.42, 6.55, 6.48, HEX.navy);
  s.addNotes('Conectar con DEC-06/RQNF-003. Aclarar límites: el filtro cubre formatos comunes y nombres conocidos; no se promete anonimización universal.');
}

{
  const s = lightSlide('Evaluación: recuperación y sistema se miden por separado', 'Evidencia');
  rect(s, 0.76, 1.45, 3.3, 4.9, HEX.navy, 0.14);
  tx(s, '20', { x: 1.05, y: 1.82, w: 2.72, h: 0.68, fontSize: 44, bold: true, color: HEX.gold, align: 'center' });
  tx(s, 'preguntas Golden Set RAG', { x: 1.08, y: 2.65, w: 2.66, h: 0.5, fontSize: 18, bold: true, color: HEX.white, align: 'center' });
  const dist = [['12', 'con respuesta'], ['4', 'sin respaldo'], ['2', 'conflictos'], ['2', 'versiones']];
  dist.forEach((v, i) => {
    pill(s, v[0], 1.13, 3.48 + i * 0.56, 0.62, i < 2 ? HEX.teal : HEX.coral);
    tx(s, v[1], { x: 1.92, y: 3.59 + i * 0.56, w: 1.65, h: 0.18, fontSize: 12.5, color: HEX.white });
  });
  rect(s, 4.48, 1.45, 8.1, 4.9, HEX.light, 0.14, { color: HEX.line, width: 1 });
  tx(s, '25 / 25', { x: 4.85, y: 1.78, w: 2.25, h: 0.55, fontSize: 38, bold: true, color: HEX.teal });
  tx(s, 'pruebas automatizadas aprobadas', { x: 7.02, y: 1.93, w: 4.7, h: 0.3, fontSize: 18, bold: true, color: HEX.navy });
  const groups = [
    ['Autorización', 'U-03 · otra organización · C-010', HEX.coral],
    ['Transacción', 'C-016 · confirmación · idempotencia', HEX.teal],
    ['Casos', 'C-011 · C-012 · C-013 · C-018 · C-020', HEX.gold],
    ['Seguridad y fallos', 'PII · C-014 · API 503', HEX.navy],
  ];
  groups.forEach((g, i) => {
    circle(s, String(i + 1), 4.88, 2.82 + i * 0.73, g[2], 0.4);
    tx(s, g[0], { x: 5.48, y: 2.82 + i * 0.73, w: 1.6, h: 0.23, fontSize: 14, bold: true, color: g[2] });
    tx(s, g[1], { x: 7.08, y: 2.81 + i * 0.73, w: 4.6, h: 0.26, fontSize: 12.5, color: HEX.ink });
  });
  pill(s, 'TypeScript ✓', 4.98, 5.83, 1.85, HEX.teal);
  pill(s, 'Next.js build ✓', 7.06, 5.83, 2.18, HEX.teal);
  pill(s, 'CLI FastMCP ✓', 9.47, 5.83, 2.18, HEX.teal);
  tx(s, 'Golden Set validado · evaluación de generación con Gemini pendiente', { x: 2.15, y: 6.62, w: 9.1, h: 0.28, fontSize: 13.5, bold: true, color: HEX.coral, align: 'center' });
  s.addNotes('Separar claramente Golden Set RAG de matriz de integración. El Golden Set fue confirmado por Nikolas el 8 de noviembre; la evaluación de generación con Gemini sigue pendiente.');
}

{
  const s = lightSlide('Demostración: ocho evidencias en un recorrido', 'Evidencia');
  const items = [
    ['D1', 'Cita abierta', 'fuente, sección y versión'], ['D2', 'Abstención', 'pregunta sin respaldo'],
    ['D3', 'Conflicto', '80 frente a 85'], ['D4', 'Traza MCP', 'vigente frente a derogada'],
    ['D5', 'Confirmación', 'preparar → confirmar → releer'], ['D6', 'Guardrail', 'rol, estado o tercera solicitud'],
    ['D7', 'Cliente CLI', 'Streamable HTTP'], ['D8', 'Imprevista', 'respuesta con el mismo método'],
  ];
  items.forEach((it, i) => {
    const col = i % 4, row = Math.floor(i / 4), x = 0.75 + col * 3.12, y = 1.48 + row * 2.38;
    rect(s, x, y, 2.72, 1.92, i === 4 || i === 5 ? HEX.mint : HEX.light, 0.14, { color: i === 4 || i === 5 ? HEX.sea : HEX.line, width: 1 });
    pill(s, it[0], x + 0.22, y + 0.2, 0.68, i < 4 ? HEX.navy : HEX.teal);
    tx(s, it[1], { x: x + 1.02, y: y + 0.28, w: 1.42, h: 0.25, fontSize: 16, bold: true, color: HEX.navy });
    tx(s, it[2], { x: x + 0.24, y: y + 0.95, w: 2.22, h: 0.48, fontSize: 12.5, color: HEX.ink, align: 'center', valign: 'mid' });
  });
  s.addShape(pptx.ShapeType.chevron, { x: 5.95, y: 6.25, w: 1.45, h: 0.44, fill: { color: HEX.coral }, line: noLine });
  tx(s, '15 min: explicar → demostrar → comprobar', { x: 3.60, y: 6.84, w: 6.12, h: 0.28, fontSize: 17, bold: true, color: HEX.teal, align: 'center' });
  s.addNotes('Este mapeo D1–D8 es una propuesta del equipo. En D5 releer solicitudes; en D7 usar el cliente CLI ya comprobado.');
}

pptx.addSection({ title: 'Cierre' });
{
  const s = darkSlide('Qué defendemos y qué falta cerrar', 'Cierre');
  const claims = [
    ['RAG', 'evidencia trazable', 'No inventa reglas'],
    ['MCP', 'acceso gobernado', 'No confía en el modelo'],
    ['Humano', 'decisión y confirmación', 'No delega responsabilidad'],
  ];
  claims.forEach((v, i) => {
    rect(s, 0.78 + i * 4.14, 1.55, 3.66, 2.05, '183D4F', 0.16, { color: '2E5A6B', width: 1 });
    circle(s, String(i + 1), 1.05 + i * 4.14, 1.87, i === 0 ? HEX.teal : i === 1 ? HEX.gold : HEX.coral, 0.58);
    tx(s, v[0], { x: 1.78 + i * 4.14, y: 1.92, w: 2.15, h: 0.3, fontSize: 22, bold: true, color: HEX.white });
    tx(s, v[1], { x: 1.05 + i * 4.14, y: 2.62, w: 3.12, h: 0.28, fontSize: 16, bold: true, color: HEX.sea, align: 'center' });
    tx(s, v[2], { x: 1.05 + i * 4.14, y: 3.12, w: 3.12, h: 0.22, fontSize: 12.5, color: HEX.white, align: 'center' });
  });
  rect(s, 1.12, 4.35, 11.08, 1.25, HEX.white, 0.16, noLine);
  tx(s, 'Pendientes honestos', { x: 1.48, y: 4.67, w: 2.4, h: 0.28, fontSize: 19, bold: true, color: HEX.coral });
  tx(s, '1  Configurar Gemini con control de cuota', { x: 4.00, y: 4.58, w: 3.5, h: 0.24, fontSize: 12.5, color: HEX.ink });
  tx(s, '2  Ejecutar y anotar generación', { x: 4.00, y: 5.02, w: 4.0, h: 0.24, fontSize: 12.5, color: HEX.ink });
  tx(s, '3  Ensayar demo D1–D8', { x: 8.08, y: 4.79, w: 3.55, h: 0.3, fontSize: 12.5, color: HEX.ink, valign: 'mid' });
  pill(s, 'Sistema reproducible · controles verificados · resultados no inventados', 2.55, 6.34, 8.25, HEX.teal);
  s.addNotes('Cerrar con la defensa técnica. Golden Set y controles están verificados; queda pendiente la evaluación de generación con Gemini y el ensayo de demostración D1–D8.');
}

(async () => {
  await pptx.writeFile({ fileName: OUT });
  console.log(OUT);
})().catch(err => { console.error(err); process.exit(1); });
