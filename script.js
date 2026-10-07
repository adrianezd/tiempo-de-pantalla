// Tiempo de pantalla: límites por app, registro diario, historial y pantalla de pausa.
// Una web no puede leer el uso de otras apps ni bloquearlas por sí sola: los minutos
// reales se apuntan desde Tiempo de uso o Bienestar digital, y el bloqueo funciona con
// una automatización del móvil que abre esta web (?app=id) cada vez que abres la app.
'use strict';

var BASE = location.origin + location.pathname;
var CLAVE = 'tiempo-pantalla-v1';
// [id, nombre, emoji, límite diario en minutos, enlace para volver a abrir la app]
var PRESETS = [
  ['instagram', 'Instagram', '📸', 60, 'instagram://'],
  ['tiktok', 'TikTok', '🎵', 45, 'snssdk1233://'],
  ['youtube', 'YouTube', '▶️', 60, 'youtube://'],
  ['whatsapp', 'WhatsApp', '💬', 90, 'whatsapp://'],
  ['x', 'X', '🐦', 30, 'twitter://'],
  ['facebook', 'Facebook', '👍', 30, 'fb://'],
  ['reddit', 'Reddit', '👽', 30, 'reddit://'],
  ['twitch', 'Twitch', '🎮', 60, 'twitch://'],
  ['netflix', 'Netflix', '🎬', 90, 'nflx://'],
  ['telegram', 'Telegram', '✈️', 60, 'tg://'],
  ['juegos', 'Juegos', '🕹️', 60, '']
];

var S = cargar();
function cargar() {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {}
  if (!s || !s.apps) {
    s = { apps: PRESETS.slice(0, 4).map(nuevaApp), dias: {} };
  }
  return s;
}
function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {} }
function nuevaApp(p) { return { id: p[0], nombre: p[1], emoji: p[2], limite: p[3], enlace: p[4] || '', modo: 'pausa', concede: 10, espera: 8 }; }

/* ---------- utilidades ---------- */
function $(id) { return document.getElementById(id); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function claveDia(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function diaDe(clave) { var p = clave.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function menosDias(d, n) { var x = new Date(d); x.setDate(x.getDate() - n); return x; }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function dur(min) {
  min = Math.round(min);
  if (min < 60) return min + ' min';
  return Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : '');
}
function corto(min) { min = Math.round(min); return min < 60 ? min + 'm' : Math.floor(min / 60) + 'h' + (min % 60 ? ' ' + (min % 60) + 'm' : ''); }
function app(id) { return S.apps.filter(function (a) { return a.id === id; })[0]; }
function reg(clave, id, crear) {
  var d = S.dias[clave];
  if (!d) { if (!crear) return null; d = S.dias[clave] = {}; }
  if (!d[id] && crear) d[id] = { real: null, est: 0, aperturas: 0, saltos: 0 };
  return d[id] || null;
}
// minutos de un día: los apuntados de Tiempo de uso si los hay; si no, los estimados
function usados(clave, id) { var r = reg(clave, id); return r ? (r.real != null ? r.real : r.est) : 0; }
function esEstimado(clave, id) { var r = reg(clave, id); return !!r && r.real == null && r.est > 0; }
function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('ver'); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove('ver'); }, 1800); }

/* ---------- pestañas ---------- */
function verPestana(id) {
  document.querySelectorAll('.pestanas button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === id); b.setAttribute('aria-selected', b.dataset.p === id); });
  document.querySelectorAll('.panel').forEach(function (p) { p.hidden = p.id !== 'p-' + id; });
  ({ hoy: pintarHoy, apuntar: pintarApuntar, historial: pintarHistorial, apps: pintarApps, bloqueo: pintarBloqueo })[id]();
  try { sessionStorage.setItem('tp-pestana', id); } catch (e) {}
}

/* ---------- hoy ---------- */
function pintarHoy() {
  var k = claveDia(), total = 0, aperturas = 0;
  var filas = S.apps.map(function (a) {
    var m = usados(k, a.id), r = reg(k, a.id) || { aperturas: 0 };
    total += m; aperturas += r.aperturas;
    var pct = a.limite ? Math.min(100, m / a.limite * 100) : 0, pasado = a.limite && m >= a.limite;
    return '<li class="fila-app"><span class="emo">' + a.emoji + '</span><div class="fa-txt"><div class="fa-cab"><b>' + esc(a.nombre) + '</b><span>' +
      dur(m) + ' de ' + dur(a.limite) + (esEstimado(k, a.id) ? ' <em>estimado</em>' : '') + '</span></div>' +
      '<div class="barra" title="' + esc(a.nombre) + ': ' + dur(m) + ' de ' + dur(a.limite) + '"><div style="width:' + pct + '%;background:' + (pasado ? 'var(--malo)' : 'var(--accent)') + '"></div></div>' +
      '<small>' + r.aperturas + ' aperturas' + (a.modo === 'bloqueo' ? ' · bloqueo total' : pasado ? ' · límite superado' : ' · quedan ' + dur(a.limite - m)) + '</small></div></li>';
  }).join('');
  $('hoyTotal').textContent = dur(total);
  $('hoyAperturas').textContent = aperturas;
  var pasadas = S.apps.filter(function (a) { return a.limite && usados(k, a.id) >= a.limite; }).length;
  $('hoyPasadas').textContent = pasadas + ' de ' + S.apps.length;
  $('hoyLista').innerHTML = filas || '<li class="texto">Añade apps en la pestaña Apps.</li>';
}

/* ---------- apuntar ---------- */
function pintarApuntar() {
  var f = $('apFecha');
  if (!f.value) f.value = claveDia();
  var k = f.value;
  $('apLista').innerHTML = S.apps.map(function (a) {
    var r = reg(k, a.id);
    return '<label class="ap-fila"><span>' + a.emoji + ' ' + esc(a.nombre) + '</span><input type="number" min="0" max="1440" inputmode="numeric" data-ap="' + a.id + '" value="' + (r && r.real != null ? r.real : '') + '" placeholder="' + (r && r.est ? Math.round(r.est) + ' estimado' : 'minutos') + '"></label>';
  }).join('');
}
function guardarApuntes() {
  var k = $('apFecha').value || claveDia();
  document.querySelectorAll('[data-ap]').forEach(function (inp) {
    var v = inp.value.trim();
    if (v === '') { var r0 = reg(k, inp.dataset.ap); if (r0) r0.real = null; return; }
    reg(k, inp.dataset.ap, true).real = Math.max(0, Math.min(1440, +v || 0));
  });
  guardar(); toast('Guardado');
}

/* ---------- historial ---------- */
function pintarHistorial() {
  var sel = $('hApp'), dias = +$('hRango').value;
  var actual = sel.value;
  sel.innerHTML = '<option value="">Todas las apps</option>' + S.apps.map(function (a) { return '<option value="' + a.id + '">' + a.emoji + ' ' + esc(a.nombre) + '</option>'; }).join('');
  sel.value = app(actual) ? actual : '';
  var id = sel.value, hoy = new Date();
  var serie = [], prev = 0;
  for (var i = dias - 1; i >= 0; i--) {
    var k = claveDia(menosDias(hoy, i));
    serie.push({ k: k, m: minutosDia(k, id) });
  }
  for (i = dias * 2 - 1; i >= dias; i--) prev += minutosDia(claveDia(menosDias(hoy, i)), id);
  var total = serie.reduce(function (s, x) { return s + x.m; }, 0);
  var conDatos = serie.filter(function (x) { return x.m > 0; }).length || 1;
  var limite = id ? app(id).limite : S.apps.reduce(function (s, a) { return s + a.limite; }, 0);
  var sobre = serie.filter(function (x) { return limite && x.m >= limite; }).length;
  $('hMedia').textContent = dur(total / conDatos);
  $('hTotal').textContent = dur(total);
  $('hSobre').textContent = sobre + (sobre === 1 ? ' día' : ' días');
  $('hCambio').textContent = prev ? ((total >= prev ? '+' : '') + Math.round((total - prev) / prev * 100) + '%') : 'Sin datos';
  // barras por día, una sola serie
  var max = Math.max(limite || 0, 1, Math.max.apply(null, serie.map(function (x) { return x.m; })));
  var cada = dias <= 7 ? 1 : dias <= 30 ? 5 : 15;
  $('hGrafico').innerHTML = '<div class="g-limite" style="bottom:calc(20px + (100% - 20px) * ' + (limite / max).toFixed(4) + ')" ' + (limite ? '' : 'hidden') + '><span>Límite ' + dur(limite) + '</span></div>' +
    serie.map(function (x, j) {
      var d = diaDe(x.k), et = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      return '<div class="g-col" title="' + et + ': ' + dur(x.m) + '"><div class="g-barra' + (limite && x.m >= limite ? ' pasada' : '') + '" style="height:' + (x.m / max * 100) + '%"></div>' +
        '<span class="g-et">' + ((dias - 1 - j) % cada === 0 ? (dias <= 7 ? d.toLocaleDateString('es-ES', { weekday: 'short' }) : d.getDate() + '/' + (d.getMonth() + 1)) : '') + '</span></div>';
    }).join('');
  // tabla por app
  $('hTabla').innerHTML = S.apps.map(function (a) {
    var t = 0, ap = 0, so = 0, n = 0;
    serie.forEach(function (x) { var m = usados(x.k, a.id), r = reg(x.k, a.id); t += m; if (m) n++; if (r) ap += r.aperturas; if (a.limite && m >= a.limite) so++; });
    return { a: a, t: t, ap: ap, so: so, media: n ? t / n : 0 };
  }).sort(function (p, q) { return q.t - p.t; }).map(function (x) {
    return '<tr><td>' + x.a.emoji + ' ' + esc(x.a.nombre) + '</td><td class="n">' + corto(x.media) + '</td><td class="n">' + corto(x.t) + '</td><td class="n">' + x.ap + '</td><td class="n">' + x.so + '</td></tr>';
  }).join('');
}
function minutosDia(k, id) {
  if (id) return usados(k, id);
  return S.apps.reduce(function (s, a) { return s + usados(k, a.id); }, 0);
}

/* ---------- apps ---------- */
function pintarApps() {
  $('appsLista').innerHTML = S.apps.map(function (a, i) {
    return '<div class="tarjeta app-ed" data-i="' + i + '">' +
      '<div class="app-cab"><input class="e-emo" data-k="emoji" value="' + esc(a.emoji) + '" aria-label="Emoji"><input data-k="nombre" value="' + esc(a.nombre) + '" aria-label="Nombre"><button class="mini quitar" data-quitar="' + i + '" aria-label="Quitar ' + esc(a.nombre) + '">✕</button></div>' +
      '<div class="form">' +
      '<label>Límite diario en minutos<input type="number" min="0" max="1440" data-k="limite" value="' + a.limite + '"></label>' +
      '<label>Al abrirla<select data-k="modo"><option value="pausa"' + (a.modo === 'pausa' ? ' selected' : '') + '>Pausa y luego decides</option><option value="bloqueo"' + (a.modo === 'bloqueo' ? ' selected' : '') + '>Bloqueada siempre</option></select></label>' +
      '<label>Minutos que te concedes cada vez<input type="number" min="1" max="120" data-k="concede" value="' + a.concede + '"></label>' +
      '<label>Segundos de pausa<input type="number" min="0" max="60" data-k="espera" value="' + a.espera + '"></label>' +
      '</div></div>';
  }).join('');
  var libres = PRESETS.filter(function (p) { return !app(p[0]); });
  $('addPreset').innerHTML = '<option value="">Elige una app</option>' + libres.map(function (p) { return '<option value="' + p[0] + '">' + p[2] + ' ' + p[1] + '</option>'; }).join('') + '<option value="otra">Otra app</option>';
}
function editarApp(e) {
  var t = e.target, caja = t.closest('.app-ed');
  if (!caja || !t.dataset.k) return;
  var a = S.apps[+caja.dataset.i], k = t.dataset.k;
  if (k === 'nombre' || k === 'emoji') a[k] = t.value.trim() || a[k];
  else if (k === 'modo') a.modo = t.value;
  else a[k] = Math.max(0, +t.value || 0);
  guardar();
}
function anadirApp() {
  var v = $('addPreset').value;
  if (!v) return;
  if (v === 'otra') {
    var n = prompt('Nombre de la app');
    if (!n) return;
    var id = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';
    while (app(id)) id += '2';
    S.apps.push(nuevaApp([id, n.trim(), '📱', 60, '']));
  } else {
    S.apps.push(nuevaApp(PRESETS.filter(function (p) { return p[0] === v; })[0]));
  }
  guardar(); pintarApps();
}

/* ---------- bloqueo: enlaces e instrucciones ---------- */
function enlace(a) { return BASE + '?app=' + encodeURIComponent(a.id); }
function pintarBloqueo() {
  $('blLista').innerHTML = S.apps.map(function (a) {
    return '<li><span>' + a.emoji + ' ' + esc(a.nombre) + '</span><code>' + esc(enlace(a)) + '</code><button class="mini" data-copiar="' + esc(enlace(a)) + '">Copiar</button><a class="mini" href="' + esc(enlace(a)) + '">Probar</a></li>';
  }).join('');
  var a = S.apps[0] || nuevaApp(PRESETS[0]);
  document.querySelectorAll('.ej-app').forEach(function (e) { e.textContent = a.nombre; });
  document.querySelectorAll('.ej-min').forEach(function (e) { e.textContent = a.concede; });
  document.querySelectorAll('.ej-url').forEach(function (e) { e.textContent = enlace(a); });
}

/* ---------- copia de seguridad ---------- */
function exportar() {
  var b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  var l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'tiempo-de-pantalla-' + claveDia() + '.json'; l.click();
}
function importar(f) {
  if (!f) return;
  f.text().then(function (t) {
    var s = JSON.parse(t);
    if (!s.apps || !s.dias) throw new Error();
    S = s; guardar(); toast('Datos importados'); verPestana('hoy');
  }).catch(function () { toast('Ese archivo no es una copia de esta web'); });
}

/* ---------- pantalla de pausa (?app=id) ---------- */
function pausa(id) {
  var a = app(id);
  $('pausa').hidden = false;
  document.body.classList.add('en-pausa');
  if (!a) {
    $('pzCaja').innerHTML = '<p class="pz-emo">🤔</p><h1>No conozco esa app</h1><p>Añádela en la pestaña Apps y copia su enlace en la automatización.</p><a class="boton" href="' + BASE + '">Ir a la web</a>';
    return;
  }
  var k = claveDia(), r = reg(k, a.id, true);
  // cuenta la apertura una sola vez aunque se recargue la página
  var marca = 'tp-ap-' + a.id, ahora = Date.now(), ult = 0;
  try { ult = +sessionStorage.getItem(marca) || 0; sessionStorage.setItem(marca, ahora); } catch (e) {}
  if (ahora - ult > 15000) { r.aperturas++; guardar(); }
  var m = usados(k, a.id);
  var bloqueada = a.modo === 'bloqueo' || (a.limite && m >= a.limite);
  var caja = $('pzCaja');
  var info = '<p class="pz-dato">Hoy: <b>' + dur(m) + '</b> de ' + dur(a.limite) + ' · apertura nº <b>' + r.aperturas + '</b></p>';
  if (bloqueada) {
    $('pausa').classList.add('bloq');
    caja.innerHTML = '<p class="pz-emo">🔒</p><h1>' + esc(a.nombre) + ' está bloqueada</h1>' +
      '<p>' + (a.modo === 'bloqueo' ? 'La tienes en bloqueo total.' : 'Ya has llegado a tu límite de hoy.') + '</p>' + info +
      '<button class="boton" id="pzSalir">Salir</button><button class="boton fantasma" id="pzForzar" disabled>Espera 30 s</button>';
    var s = 30, t = setInterval(function () {
      s--;
      var b = $('pzForzar'); if (!b) { clearInterval(t); return; }
      if (s > 0) b.textContent = 'Espera ' + s + ' s';
      else { clearInterval(t); b.disabled = false; b.textContent = 'Usar 5 min igualmente'; }
    }, 1000);
    $('pzSalir').onclick = salir;
    $('pzForzar').onclick = function () { r.est += 5; r.saltos++; guardar(); volver(a, 5); };
    return;
  }
  caja.innerHTML = '<p class="pz-emo">' + a.emoji + '</p><h1>¿Seguro que quieres abrir ' + esc(a.nombre) + '?</h1>' + info +
    '<div class="respira" id="pzRespira"><span id="pzCuenta">' + a.espera + '</span></div><p class="texto" id="pzTexto">Respira hondo mientras tanto.</p>' +
    '<div id="pzBotones" hidden><button class="boton" id="pzEntrar">Entrar ' + a.concede + ' min</button><button class="boton fantasma" id="pzNo">Hoy no</button></div>';
  var n = a.espera, tt = setInterval(function () {
    n--;
    if (n > 0) { $('pzCuenta').textContent = n; return; }
    clearInterval(tt);
    $('pzRespira').hidden = true; $('pzTexto').hidden = true; $('pzBotones').hidden = false;
  }, 1000);
  if (n <= 0) { clearInterval(tt); $('pzRespira').hidden = true; $('pzTexto').hidden = true; $('pzBotones').hidden = false; }
  $('pzEntrar').onclick = function () { r.est += a.concede; guardar(); volver(a, a.concede); };
  $('pzNo').onclick = salir;
}
function volver(a, min) {
  $('pzCaja').innerHTML = '<p class="pz-emo">⏱️</p><h1>' + min + ' minutos</h1><p>Cuando pasen, deja ' + esc(a.nombre) + '. Lo apunto como uso estimado de hoy.</p>' +
    (a.enlace ? '<a class="boton" href="' + esc(a.enlace) + '">Abrir ' + esc(a.nombre) + '</a>' : '<p class="texto">Vuelve a la app desde la pantalla de inicio.</p>') +
    '<a class="boton fantasma" href="' + BASE + '">Ver mi tiempo de hoy</a>';
}
function salir() {
  $('pzCaja').innerHTML = '<p class="pz-emo">🌿</p><h1>Bien hecho</h1><p>Cierra esta pestaña y deja el móvil un rato.</p><a class="boton fantasma" href="' + BASE + '">Ver mi tiempo de hoy</a>';
  try { window.close(); } catch (e) {}
}

/* ---------- arranque ---------- */
document.querySelectorAll('.pestanas button').forEach(function (b) { b.onclick = function () { verPestana(b.dataset.p); }; });
$('apFecha').onchange = pintarApuntar;
$('apGuardar').onclick = guardarApuntes;
$('hRango').onchange = pintarHistorial;
$('hApp').onchange = pintarHistorial;
$('appsLista').addEventListener('change', editarApp);
$('appsLista').addEventListener('click', function (e) {
  var q = e.target.closest('[data-quitar]');
  if (!q) return;
  var a = S.apps[+q.dataset.quitar];
  if (confirm('¿Quitar ' + a.nombre + '? Su historial se conserva por si la vuelves a añadir.')) { S.apps.splice(+q.dataset.quitar, 1); guardar(); pintarApps(); }
});
$('addPreset').onchange = anadirApp;
$('exportar').onclick = exportar;
$('importar').onchange = function () { importar(this.files[0]); this.value = ''; };
$('blLista').addEventListener('click', function (e) {
  var b = e.target.closest('[data-copiar]');
  if (!b) return;
  (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copiar) : Promise.reject()).then(function () { toast('Enlace copiado'); }, function () { prompt('Copia el enlace', b.dataset.copiar); });
});

var param = new URLSearchParams(location.search).get('app');
if (param) pausa(param);
else {
  var p0 = 'hoy';
  try { p0 = sessionStorage.getItem('tp-pestana') || 'hoy'; } catch (e) {}
  verPestana(p0);
}
