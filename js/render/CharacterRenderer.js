/**
 * ============================================================================
 *  GeoStrand — Karakter Çizici (CharacterRenderer)
 * ============================================================================
 *  Kâşif karakterini Canvas 2D ile KODLA çizer. Aynı fonksiyon iki yerde kullanılır:
 *    • Oyunda: 4 yön × 4 kare yürüme animasyonu içeren Phaser dokusu (spritesheet)
 *    • Karakter oluşturucuda ve HUD'da: canlı önizleme / portre
 *  Böylece oyuncunun seçtiği görünüm her yerde birebir aynıdır.
 *
 *  KARE: 36 × 44 piksel, üstten 3/4 bakış (büyük kafa, "chibi" oran).
 *  YÖNLER: down (aşağı/bize doğru), up (sırtı dönük), left, right
 *  ANİMASYON KARELERİ: 0 duruş · 1 sol adım · 2 duruş · 3 sağ adım
 *
 *  GÖRÜNÜM (appearance) alanları: name, skin, hairStyle, hairColor, hat, jacket, pack
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const W = 36;
  const H = 44;
  const DIRS = ['down', 'left', 'right', 'up'];
  const FRAMES = 4;

  /** Oluşturucuda gösterilen seçenekler */
  const OPTIONS = {
    skin: ['#f6d5b8', '#e9b88f', '#c98d5f', '#9b6541', '#6a4129'],
    hairStyle: [
      { key: 'short', label: 'Kısa' },
      { key: 'long', label: 'Uzun' },
      { key: 'curly', label: 'Kıvırcık' },
      { key: 'bun', label: 'Topuz' },
      { key: 'none', label: 'Kazınmış' },
    ],
    hairColor: ['#2a1b12', '#5b3a21', '#a8652b', '#e0bd70', '#b9b4ad', '#c2452f'],
    hat: [
      { key: 'safari', label: 'Kâşif şapkası' },
      { key: 'beanie', label: 'Bere' },
      { key: 'cap', label: 'Kep' },
      { key: 'none', label: 'Şapkasız' },
    ],
    jacket: ['#e0782f', '#2f6fd6', '#2e8b57', '#c0392b', '#7d4fb5', '#d9a520'],
    pack: ['#4b5d3a', '#7a4a2a', '#2c3e50', '#9c2f2f'],
  };

  const DEFAULT = {
    name: 'Kâşif',
    skin: OPTIONS.skin[1],
    hairStyle: 'short',
    hairColor: OPTIONS.hairColor[1],
    hat: 'safari',
    jacket: OPTIONS.jacket[0],
    pack: OPTIONS.pack[0],
  };

  const PANTS = '#5a5143';
  const SHOES = '#2a211a';
  const OUTLINE = 'rgba(20, 16, 12, 0.55)';

  // ==================================================================== //
  //  Tek kare çizimi
  // ==================================================================== //

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} a görünüm
   * @param {'down'|'up'|'left'|'right'} dir
   * @param {number} frame 0–3
   * @param {number} ox kare sol üst köşesi x
   * @param {number} oy kare sol üst köşesi y
   */
  function drawFrame(ctx, a, dir, frame, ox = 0, oy = 0) {
    const step = [0, 1, 0, -1][frame];       // bacak salınımı
    const bob = frame % 2 === 1 ? -1 : 0;    // adımda gövde hafif yükselir
    ctx.save();
    ctx.translate(ox, oy);

    // Gölge (zıplamaz)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(ctx, 18, 41, 10, 3.2);

    ctx.translate(0, bob);
    if (dir === 'left') {
      // Sola bakış = sağa bakışın aynası
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      drawSide(ctx, a, step);
    } else if (dir === 'right') {
      drawSide(ctx, a, step);
    } else {
      drawFrontBack(ctx, a, step, dir === 'up');
    }
    ctx.restore();
  }

  /** Önden (down) veya arkadan (up) görünüm */
  function drawFrontBack(ctx, a, step, back) {
    const jacketDark = shade(a.jacket, -0.25);

    // Bacaklar
    ctx.fillStyle = PANTS;
    roundRect(ctx, 13, 30 - step * 1.2, 4.5, 9, 1.5);
    roundRect(ctx, 18.5, 30 + step * 1.2, 4.5, 9, 1.5);
    ctx.fillStyle = SHOES;
    roundRect(ctx, 12.5, 37.5 - step * 1.2, 5.5, 3, 1.2);
    roundRect(ctx, 18, 37.5 + step * 1.2, 5.5, 3, 1.2);

    // Arkadan: çanta gövdenin üstünde; önden: çanta gövdenin arkasında (yanlardan görünür)
    if (!back) {
      ctx.fillStyle = shade(a.pack, -0.15);
      roundRect(ctx, 9, 19, 18, 11, 3);
    }

    // Kollar (salınım)
    ctx.fillStyle = jacketDark;
    roundRect(ctx, 7.5, 20 + step * 1.5, 4, 9, 2);
    roundRect(ctx, 24.5, 20 - step * 1.5, 4, 9, 2);
    ctx.fillStyle = a.skin;
    circle(ctx, 9.5, 29.5 + step * 1.5, 2);
    circle(ctx, 26.5, 29.5 - step * 1.5, 2);

    // Gövde (ceket)
    ctx.fillStyle = a.jacket;
    roundRect(ctx, 10.5, 19, 15, 13, 4);
    ctx.fillStyle = jacketDark;
    ctx.fillRect(10.5, 29, 15, 2.2); // kemer hizası
    if (!back) {
      // Fermuar ve yaka
      ctx.fillStyle = shade(a.jacket, 0.25);
      ctx.fillRect(17.5, 21, 1, 8);
      ctx.fillStyle = a.pack;
      ctx.fillRect(12.5, 19.5, 2, 9); // çanta askıları
      ctx.fillRect(21.5, 19.5, 2, 9);
    } else {
      // Sırt çantası + üstünde rulo mat
      ctx.fillStyle = a.pack;
      roundRect(ctx, 11.5, 18.5, 13, 12, 3);
      ctx.fillStyle = shade(a.pack, -0.2);
      roundRect(ctx, 11.5, 18.5, 13, 4, 2);
      ctx.fillStyle = '#d8c9a3';
      roundRect(ctx, 10.5, 16.5, 15, 3.5, 1.7);
    }

    // Kafa
    const cx = 18;
    const cy = 12.5;
    const r = 8.5;
    if (a.hairStyle === 'long') drawLongHairBack(ctx, a, cx, cy, r, back);
    ctx.fillStyle = a.skin;
    circle(ctx, cx, cy, r);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    if (!back) {
      // Yüz: gözler + yanaklar + gülümseme
      ctx.fillStyle = '#2a1b12';
      circle(ctx, cx - 3.4, cy + 1.2, 1.25);
      circle(ctx, cx + 3.4, cy + 1.2, 1.25);
      ctx.fillStyle = 'rgba(235, 110, 110, 0.35)';
      ellipse(ctx, cx - 5.2, cy + 3.8, 1.8, 1.1);
      ellipse(ctx, cx + 5.2, cy + 3.8, 1.8, 1.1);
      ctx.strokeStyle = 'rgba(60, 30, 20, 0.7)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy + 3.6, 1.6, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }

    drawHair(ctx, a, cx, cy, r, back ? 'back' : 'front');
    drawHat(ctx, a, cx, cy, r, back ? 'back' : 'front');
  }

  /** Yandan görünüm (sağa bakan; sol için aynalanır) */
  function drawSide(ctx, a, step) {
    const jacketDark = shade(a.jacket, -0.25);

    // Arka bacak, ön bacak
    ctx.fillStyle = shade(PANTS, -0.2);
    roundRect(ctx, 15 - step * 2.5, 30, 4.5, 9, 1.5);
    ctx.fillStyle = SHOES;
    roundRect(ctx, 14.5 - step * 2.5, 37.5, 6.5, 3, 1.2);
    ctx.fillStyle = PANTS;
    roundRect(ctx, 16.5 + step * 2.5, 30, 4.5, 9, 1.5);
    ctx.fillStyle = SHOES;
    roundRect(ctx, 16.5 + step * 2.5, 37.5, 6.5, 3, 1.2);

    // Çanta (sırtta = solda)
    ctx.fillStyle = a.pack;
    roundRect(ctx, 6.5, 18, 8, 12.5, 3);
    ctx.fillStyle = '#d8c9a3';
    roundRect(ctx, 6, 16, 8.5, 3.5, 1.7);

    // Gövde
    ctx.fillStyle = a.jacket;
    roundRect(ctx, 12, 19, 12.5, 13, 4);
    ctx.fillStyle = jacketDark;
    ctx.fillRect(12, 29, 12.5, 2.2);

    // Ön kol (salınır)
    ctx.fillStyle = jacketDark;
    roundRect(ctx, 16 + step * 2, 20.5, 4, 8.5, 2);
    ctx.fillStyle = a.skin;
    circle(ctx, 18 + step * 2, 29.5, 2);

    // Kafa
    const cx = 18.5;
    const cy = 12.5;
    const r = 8.5;
    if (a.hairStyle === 'long') {
      ctx.fillStyle = a.hairColor;
      roundRect(ctx, cx - r - 0.5, cy - 2, 7, 13, 3);
    }
    ctx.fillStyle = a.skin;
    circle(ctx, cx, cy, r);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Göz + yanak + burun
    ctx.fillStyle = '#2a1b12';
    circle(ctx, cx + 4.3, cy + 1, 1.25);
    ctx.fillStyle = 'rgba(235, 110, 110, 0.35)';
    ellipse(ctx, cx + 3.5, cy + 4, 1.8, 1.1);
    ctx.fillStyle = a.skin;
    circle(ctx, cx + r - 0.3, cy + 2, 1.6);

    drawHair(ctx, a, cx, cy, r, 'side');
    drawHat(ctx, a, cx, cy, r, 'side');
  }

  // ==================================================================== //
  //  Saç ve şapka
  // ==================================================================== //

  function drawLongHairBack(ctx, a, cx, cy, r, back) {
    ctx.fillStyle = a.hairColor;
    if (back) {
      roundRect(ctx, cx - r, cy - 2, r * 2, 15, 4); // sırta dökülen saç
    } else {
      roundRect(ctx, cx - r - 1.5, cy - 1, 4.5, 12, 2); // yanlardan omuzlara
      roundRect(ctx, cx + r - 3, cy - 1, 4.5, 12, 2);
    }
  }

  /** @param {'front'|'back'|'side'} view */
  function drawHair(ctx, a, cx, cy, r, view) {
    const style = a.hairStyle;
    ctx.fillStyle = a.hairColor;
    if (style === 'none') {
      ctx.globalAlpha = 0.25;
      halfDome(ctx, cx, cy - 1, r, r - 1.5);
      ctx.globalAlpha = 1;
      return;
    }
    if (view === 'back') {
      // Arkadan: başın çoğu saç
      circle(ctx, cx, cy - 0.5, r + 0.6);
    } else if (view === 'side') {
      halfDome(ctx, cx - 0.5, cy - 1, r + 0.8, r);
      roundRect(ctx, cx - r - 0.3, cy - 3, 7, 7, 3); // ense
    } else {
      halfDome(ctx, cx, cy - 1, r + 0.8, r - 0.5);
      // Kâkül
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - 1);
      ctx.quadraticCurveTo(cx - 2, cy + 1.5, cx + 1, cy - 2.5);
      ctx.quadraticCurveTo(cx + 4, cy + 0.5, cx + r, cy - 1);
      ctx.lineTo(cx + r, cy - 3);
      ctx.lineTo(cx - r, cy - 3);
      ctx.fill();
    }
    if (style === 'curly') {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const ang = Math.PI + (i / (n - 1)) * Math.PI;
        circle(ctx, cx + Math.cos(ang) * (r + 0.4), cy - 1 + Math.sin(ang) * (r - 0.5), 2.6);
      }
    }
    if (style === 'bun') {
      circle(ctx, view === 'side' ? cx - 4 : cx, cy - r - 1.5, 3.6);
    }
  }

  /** @param {'front'|'back'|'side'} view */
  function drawHat(ctx, a, cx, cy, r, view) {
    if (a.hat === 'safari') {
      const brim = '#a9843f';
      const crown = '#c9a35a';
      ctx.fillStyle = brim;
      ellipse(ctx, cx, cy - 4.5, r + 5, 3.6);
      ctx.fillStyle = crown;
      halfDome(ctx, cx, cy - 4, r - 0.5, 6.5);
      ctx.fillStyle = '#6b4d22';
      ctx.fillRect(cx - r + 0.6, cy - 6, (r - 0.6) * 2, 1.8); // bant
    } else if (a.hat === 'beanie') {
      ctx.fillStyle = a.jacket;
      halfDome(ctx, cx, cy - 1.5, r + 1, r);
      ctx.fillStyle = shade(a.jacket, -0.2);
      roundRect(ctx, cx - r - 1, cy - 3.5, (r + 1) * 2, 3.5, 1.5);
      ctx.fillStyle = '#f2efe6';
      circle(ctx, view === 'side' ? cx - 2 : cx, cy - r - 2.5, 2.6); // ponpon
    } else if (a.hat === 'cap') {
      ctx.fillStyle = a.jacket;
      halfDome(ctx, cx, cy - 1.5, r + 0.8, r - 0.5);
      ctx.fillStyle = shade(a.jacket, -0.3);
      if (view === 'front') ellipse(ctx, cx, cy - 2, 6.5, 2.3);
      if (view === 'side') ellipse(ctx, cx + r + 1.5, cy - 2.5, 5, 1.8);
    }
  }

  // ==================================================================== //
  //  Phaser entegrasyonu
  // ==================================================================== //

  /**
   * Görünümden Phaser dokusu + yürüme animasyonları üretir.
   * Aynı görünüm tekrar istenirse var olanı kullanır.
   * @returns {string} doku anahtarı
   */
  function buildSpritesheet(scene, a) {
    const key = `hero_${hash(a)}`;
    if (!scene.textures.exists(key)) {
      const tex = scene.textures.createCanvas(key, W * FRAMES, H * DIRS.length);
      const ctx = tex.getContext();
      DIRS.forEach((dir, row) => {
        for (let f = 0; f < FRAMES; f++) {
          drawFrame(ctx, a, dir, f, f * W, row * H);
          tex.add(`${dir}-${f}`, 0, f * W, row * H, W, H);
        }
      });
      tex.refresh();
    }
    DIRS.forEach((dir) => {
      const animKey = `${key}-walk-${dir}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: [0, 1, 2, 3].map((f) => ({ key, frame: `${dir}-${f}` })),
          frameRate: 8,
          repeat: -1,
        });
      }
    });
    return key;
  }

  /** HUD ve oluşturucu için portre (baş + omuzlar) */
  function drawPortrait(canvas, a) {
    const ctx = canvas.getContext('2d');
    const s = canvas.width / 24;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(-6, 1);
    drawFrame(ctx, a, 'down', 0, 0, 0);
    ctx.restore();
  }

  // ==================================================================== //
  //  Görünüm yardımcıları
  // ==================================================================== //

  function normalize(a) {
    return { ...DEFAULT, ...(a || {}) };
  }

  function randomAppearance(rng = Math.random) {
    const pick = (list) => list[Math.floor(rng() * list.length)];
    return {
      name: DEFAULT.name,
      skin: pick(OPTIONS.skin),
      hairStyle: pick(OPTIONS.hairStyle).key,
      hairColor: pick(OPTIONS.hairColor),
      hat: pick(OPTIONS.hat).key,
      jacket: pick(OPTIONS.jacket),
      pack: pick(OPTIONS.pack),
    };
  }

  function hash(a) {
    const str = [a.skin, a.hairStyle, a.hairColor, a.hat, a.jacket, a.pack].join('|');
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  // ==================================================================== //
  //  Çizim yardımcıları
  // ==================================================================== //

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Üst yarım elips (saç ve şapka kubbesi) */
  function halfDome(ctx, x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  /** Rengi aç (+) / koyulaştır (−); amount −1…1 */
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
    const r = ch((n >> 16) & 255);
    const g = ch((n >> 8) & 255);
    const b = ch(n & 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  GS.CharacterRenderer = {
    W, H, DIRS, FRAMES, OPTIONS, DEFAULT,
    drawFrame, drawPortrait, buildSpritesheet, normalize, randomAppearance, hash,
  };
})(window.GS = window.GS || {});
