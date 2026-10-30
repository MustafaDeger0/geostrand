/**
 * ============================================================================
 *  GeoStrand — Kurtuluş Haritası (RouteMap)
 * ============================================================================
 *  Kâşifin kurtulduğu yerleri gerçek bir dünya haritasında gösterir:
 *    • Her kurtuluş bir bayrak (sıra numarası + iklimin rengi)
 *    • Bayraklar arasında Geo-Teleporter'ın sıçrayış yayları (kaçış rotası)
 *    • Ekvator, dönenceler ve kutup daireleri (enlem kavramı haritada görünür)
 *    • İstenirse en son bayrak "yeni" olarak canlandırılır: sıçrama ışığı yay
 *      boyunca gider, bayrak düşer, kurtarma helikopteri havalanır.
 *
 *  Kullanıldığı yerler: bölgeler arası uçuş perdesi, oyun sonu, duraklatma
 *  menüsü, günlük meydan okuma sonucu.
 *
 *  Saf SVG metni üretir (HTML'e yerleştirilir). Animasyonlar SVG/CSS ile;
 *  oyun döngüsüne yük bindirmez.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** İklimlerin harita rengi (bayrak) */
  const CLIMATE_COLORS = {
    EKVATORAL: '#2f9e5b',
    COL: '#e0a43a',
    AKDENIZ: '#7aa83a',
    MUSON: '#3a8fd0',
    SERT_KARASAL: '#2f6f63',
    TUNDRA: '#8fb7d6',
  };

  /** Önemli enlemler: [enlem, etiket, sınıf] */
  const PARALLELS = [
    [66.5, 'Kuzey Kutup Dairesi', 'polar'],
    [23.5, 'Yengeç Dönencesi', 'tropic'],
    [0, 'Ekvator', 'equator'],
    [-23.5, 'Oğlak Dönencesi', 'tropic'],
  ];

  let uid = 0;

  const RouteMap = {
    CLIMATE_COLORS,

    /**
     * @param {object} opts
     * @param {Array<{loc:object, stars?:number}>} opts.route kurtulunan yerler (sırayla)
     * @param {boolean} [opts.animateLast] son bayrağı yeni gibi canlandır
     * @param {boolean} [opts.labels]      enlem çizgisi etiketleri
     * @param {string}  [opts.className]
     * @returns {string} SVG
     */
    svg({ route = [], animateLast = false, labels = true, className = '' } = {}) {
      const M = GS.WORLD_MAP;
      const id = `rm${++uid}`;
      const pts = route.map((r) => {
        const lat = r.loc.hemisphere === 'GUNEY' ? -r.loc.latitude : r.loc.latitude;
        return { ...M.project(lat, r.loc.lon || 0), r };
      });

      const parallels = PARALLELS.map(([lat, label, cls]) => {
        const y = M.project(lat, 0).y.toFixed(1);
        return `<line class="rm-par ${cls}" x1="0" x2="${M.width}" y1="${y}" y2="${y}"/>` +
          (labels ? `<text class="rm-par-label ${cls}" x="6" y="${(y - 4).toFixed(1)}">${label}</text>` : '');
      }).join('');

      // Sıçrama yayları: iki nokta arasında yukarı kavisli eğri
      const arcs = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - Math.min(120, Math.hypot(b.x - a.x, b.y - a.y) * 0.28);
        const d = `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
        const last = i === pts.length - 1;
        arcs.push({ d, last });
      }
      const arcSvg = arcs.map((a, i) => `<path id="${id}-arc${i}" class="rm-arc${a.last && animateLast ? ' new' : ''}" d="${a.d}"/>`).join('');

      const flags = pts.map((p, i) => {
        const last = i === pts.length - 1;
        const color = CLIMATE_COLORS[p.r.loc.climate] || '#ff8a3d';
        const cls = `rm-flag${last ? ' last' : ''}${last && animateLast ? ' new' : ''}`;
        return `<g class="${cls}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" style="--c:${color}">
          <title>${i + 1}. ${escapeHtml(p.r.loc.name)}</title>
          ${last ? '<circle class="rm-ring" r="9"/>' : ''}
          <g class="rm-pin"><path d="M0 0 C-7 -9 -9 -13 -9 -17 A9 9 0 1 1 9 -17 C9 -13 7 -9 0 0Z"/><text y="-13.5">${i + 1}</text></g>
        </g>`;
      }).join('');

      // Yeni kurtuluş: ışık yay boyunca gider, bayrak düşer, helikopter havalanır
      let fx = '';
      if (animateLast && pts.length) {
        const p = pts[pts.length - 1];
        const hasArc = arcs.length > 0;
        const delay = hasArc ? 0.9 : 0.1;
        fx = (hasArc ? `<circle class="rm-spark" r="5"><animateMotion dur="0.9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"><mpath href="#${id}-arc${arcs.length - 1}" xlink:href="#${id}-arc${arcs.length - 1}"/></animateMotion></circle>` : '') +
          `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="rm-heli" style="animation-delay:${(delay + 0.5).toFixed(2)}s"><text y="-24">🚁</text></g></g>`;
      }

      return `<svg class="routemap ${className}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${M.width} ${M.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kurtuluş haritası: ${pts.length} bölge">
        <defs>
          <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#16424a"/><stop offset="0.5" stop-color="#1d5660"/><stop offset="1" stop-color="#16424a"/>
          </linearGradient>
        </defs>
        <rect class="rm-sea" width="${M.width}" height="${M.height}" fill="url(#${id}-sea)"/>
        <path class="rm-land" d="${M.land}"/>
        ${parallels}
        ${arcSvg}
        ${flags}
        ${fx}
      </svg>`;
    },

    /** Kurtulunan yerlerin kısa listesi (harita altı) */
    legend(route) {
      if (!route.length) return '<p class="rm-empty">Henüz kurtulduğun bir bölge yok. İlk bayrağını dik!</p>';
      return `<ol class="rm-legend">${route.map((r) => {
        const c = GS.CLIMATES[r.loc.climate];
        const lat = `${r.loc.latitude}° ${r.loc.hemisphere === 'GUNEY' ? 'G' : 'K'}`;
        const stars = r.stars ? `<span class="rm-stars">${'⭐'.repeat(r.stars)}</span>` : '';
        return `<li style="--c:${CLIMATE_COLORS[r.loc.climate]}"><b>${escapeHtml(shortName(r.loc.name))}</b><small>${c.icon} ${c.label} · ${lat}</small>${stars}</li>`;
      }).join('')}</ol>`;
    },

    shortName,
  };

  /** "Madrid (İber Meseta Platosu), İspanya" → "Madrid, İspanya" */
  function shortName(name) {
    return name.replace(/\s*\([^)]*\)/g, '');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  GS.RouteMap = RouteMap;
})(window.GS = window.GS || {});
