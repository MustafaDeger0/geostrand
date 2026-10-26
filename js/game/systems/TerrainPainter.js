/**
 * ============================================================================
 *  GeoStrand — Arazi Ressamı (TerrainPainter)
 * ============================================================================
 *  Haritadaki büyük yer şekillerini KODLA çizer (resim dosyası gerekmez):
 *    • makeGroundTexture : İklime özel, kenarları birleşen (tileable) zemin dokusu
 *    • drawMountain      : Kuzeybatıdan ışık alan, yüzeyli dağ zirvesi
 *    • drawLake          : Kıyılı göl / vaha / donmuş göl
 *    • drawRiver         : Haritayı kesen nehir (donmuş da olabilir) + köprü
 *    • drawCanyon        : Platoyu yaran kanyon + iniş patikası (geçit)
 *    • drawField         : Ovada tarlalar (buğday, çeltik, meyve bahçesi)
 *    • drawDune          : Kum tepesi
 *    • drawEdgeFog       : Harita kenarında yumuşak sis (dünya "bitmiyor" hissi)
 *
 *  Bu sınıf sadece ÇİZER; nereye çizileceğine ve çarpışmaya WorldBuilder karar verir.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  /** Dağ tarzlarının renk paletleri: [koyu yüz, orta yüz, açık yüz, zirve] */
  const MOUNTAIN_PALETTES = {
    jungle:    { faces: [0x1d4220, 0x2c5e2b, 0x4a8a3e], cap: null,     trees: true },
    mesa:      { faces: [0x8a4a28, 0xab6236, 0xcf8550], cap: 0xd9a066, flat: true },
    limestone: { faces: [0x76766c, 0x9a9a8e, 0xc4c3b6], cap: null },
    snowy:     { faces: [0x4a5662, 0x6f7e8b, 0x98a6b2], cap: 0xf3f7f9 },
  };

  /** Göl tarzları: kıyı, su, derin su, parıltı */
  const LAKE_STYLES = {
    water:  { shore: 0xc9b98a, water: 0x2f78a8, deep: 0x1f5a85, shine: 0x9fd2f0 },
    oasis:  { shore: 0xead49a, water: 0x2aa3b2, deep: 0x1c7f93, shine: 0xb6eef2 },
    frozen: { shore: 0xe9f0f2, water: 0xbcdde9, deep: 0x9cc6d8, shine: 0xffffff },
  };

  /** Işık kuzeybatıdan gelir (ekranda sol-üst) */
  const LIGHT_DIR = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };

  const TerrainPainter = {
    MOUNTAIN_PALETTES,
    LAKE_STYLES,

    // ================================================================ //
    //  ZEMİN DOKUSU
    // ================================================================ //

    /**
     * 256x256, kenarları birbirine kusursuz eklenen gürültü dokusu üretir.
     * İki katmanlı "değer gürültüsü" (value noise) + ince kum/toprak tanecikleri.
     * TileSprite ile tüm haritaya döşenir.
     */
    makeGroundTexture(scene, key, colorA, colorB) {
      if (scene.textures.exists(key)) return;
      const size = 256;
      const tex = scene.textures.createCanvas(key, size, size);
      const ctx = tex.getContext();
      const img = ctx.createImageData(size, size);

      const coarse = periodicNoise(size, 6);  // büyük lekeler
      const fine = periodicNoise(size, 24);   // küçük dalgalanma
      const a = hexToRgb(colorA);
      const b = hexToRgb(colorB);

      for (let i = 0; i < size * size; i++) {
        const n = coarse[i] * 0.7 + fine[i] * 0.3;
        const t = Math.min(1, Math.max(0, (n - 0.25) * 1.8)); // kontrastı biraz artır
        const grain = (Math.random() - 0.5) * 10;              // tanecik
        img.data[i * 4] = clamp255(a.r + (b.r - a.r) * t + grain);
        img.data[i * 4 + 1] = clamp255(a.g + (b.g - a.g) * t + grain);
        img.data[i * 4 + 2] = clamp255(a.b + (b.b - a.b) * t + grain);
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      tex.refresh();
    },

    // ================================================================ //
    //  DAĞ
    // ================================================================ //

    /**
     * Üstten bakış dağ zirvesi: merkezden kenarlara üçgen yüzeyler.
     * Her yüzün rengi, ışığa (kuzeybatı) bakıp bakmamasına göre seçilir.
     */
    drawMountain(g, x, y, r, style) {
      const pal = MOUNTAIN_PALETTES[style];
      const peak = { x: x - r * 0.08, y: y - r * 0.22 }; // zirve hafif yukarıda: 3/4 bakış hissi
      const rim = jaggedPolygon(x, y, r, 13, 0.38).map((p) => ({ x: x + (p.x - x) * 1.12, y: p.y })); // hafif yatay basık

      // Gölge (güneydoğuya düşer)
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(x + r * 0.18, y + r * 0.2, r * 2.15, r * 1.75);

      // Yüzeyler
      for (let i = 0; i < rim.length; i++) {
        const p1 = rim[i];
        const p2 = rim[(i + 1) % rim.length];
        g.fillStyle(this._faceColor(pal.faces, p1, p2, x, y), 1);
        g.fillTriangle(peak.x, peak.y, p1.x, p1.y, p2.x, p2.y);
      }

      // Sırt çizgileri (derinlik hissi)
      g.lineStyle(1.5, 0x000000, 0.12);
      rim.forEach((p, i) => {
        if (i % 2 === 0) g.lineBetween(peak.x, peak.y, p.x, p.y);
      });

      // Zirve: kar örtüsü ya da düz plato (mesa)
      if (pal.cap) {
        const capR = pal.flat ? 0.55 : 0.36;
        const cap = rim.map((p) => ({
          x: peak.x + (p.x - peak.x) * capR,
          y: peak.y + (p.y - peak.y) * capR,
        }));
        if (pal.flat) {
          g.fillStyle(pal.cap, 1);
          g.fillPoints(cap, true);
          g.lineStyle(2, 0x000000, 0.15);
          g.strokePoints(cap, true);
        } else {
          for (let i = 0; i < cap.length; i++) {
            const p1 = cap[i];
            const p2 = cap[(i + 1) % cap.length];
            const lit = this._litAmount(p1, p2, x, y);
            g.fillStyle(lit > 0 ? pal.cap : 0xcfdbe3, 1);
            g.fillTriangle(peak.x, peak.y, p1.x, p1.y, p2.x, p2.y);
          }
        }
      }

      // Tropik tepe: üstü ağaçlarla kaplı
      if (pal.trees) {
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * r * 0.75;
          g.fillStyle(i % 2 ? 0x17361a : 0x2f6a2c, 0.9);
          g.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, r * 0.12);
        }
      }
    },

    /** Yüzeyin ışığa ne kadar baktığı (−1 … 1) */
    _litAmount(p1, p2, cx, cy) {
      const mx = (p1.x + p2.x) / 2 - cx;
      const my = (p1.y + p2.y) / 2 - cy;
      const len = Math.hypot(mx, my) || 1;
      return (mx / len) * LIGHT_DIR.x + (my / len) * LIGHT_DIR.y;
    },

    _faceColor(faces, p1, p2, cx, cy) {
      const lit = this._litAmount(p1, p2, cx, cy);
      if (lit > 0.35) return faces[2];
      if (lit > -0.35) return faces[1];
      return faces[0];
    },

    // ================================================================ //
    //  GÖL
    // ================================================================ //

    /**
     * Göl, birbirine geçen dairelerden oluşur (doğal, düzensiz kıyı).
     * @param {{x,y,r}[]} circles
     * @returns {Phaser.GameObjects.GameObject[]} parıltı nesneleri (animasyon için)
     */
    drawLake(scene, g, circles, style) {
      const s = LAKE_STYLES[style];
      // Katman katman: kıyı → su → derin su
      g.fillStyle(s.shore, 1);
      circles.forEach((c) => g.fillCircle(c.x, c.y, c.r + 14));
      g.fillStyle(s.water, 1);
      circles.forEach((c) => g.fillCircle(c.x, c.y, c.r));
      g.fillStyle(s.deep, style === 'frozen' ? 0.45 : 0.5);
      circles.forEach((c) => g.fillCircle(c.x + 4, c.y + 6, c.r * 0.55));

      if (style === 'frozen') {
        // Buz çatlakları
        g.lineStyle(1.5, 0xffffff, 0.7);
        circles.forEach((c) => {
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            const x1 = c.x + Math.cos(a) * c.r * 0.1;
            const y1 = c.y + Math.sin(a) * c.r * 0.1;
            const mid = { x: c.x + Math.cos(a + 0.3) * c.r * 0.45, y: c.y + Math.sin(a + 0.3) * c.r * 0.45 };
            g.lineBetween(x1, y1, mid.x, mid.y);
            g.lineBetween(mid.x, mid.y, c.x + Math.cos(a - 0.1) * c.r * 0.8, c.y + Math.sin(a - 0.1) * c.r * 0.8);
          }
        });
      }

      // Su yüzeyi parıltıları (WorldBuilder yavaşça yanıp söndürür)
      const shines = [];
      circles.forEach((c) => {
        const n = style === 'frozen' ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const sx = c.x + (Math.random() - 0.5) * c.r;
          const sy = c.y + (Math.random() - 0.5) * c.r * 0.8;
          shines.push(scene.add.ellipse(sx, sy, c.r * 0.45, 4, s.shine, 0.55).setDepth(-4));
        }
      });
      return shines;
    },

    // ================================================================ //
    //  NEHİR
    // ================================================================ //

    /**
     * Nehri, eğri üzerine sık aralıklarla çizilmiş dairelerle çizer
     * (kalın çizgilerde köşe boşluğu oluşmaz).
     * @param {{x,y}[]} points Eğri üzerindeki örnek noktalar
     */
    drawRiver(g, points, width, style = 'water') {
      const s = LAKE_STYLES[style];
      g.fillStyle(s.shore, 1);
      points.forEach((p) => g.fillCircle(p.x, p.y, width / 2 + 12));
      g.fillStyle(s.water, 1);
      points.forEach((p) => g.fillCircle(p.x, p.y, width / 2));
      g.fillStyle(s.deep, 0.7);
      points.forEach((p) => g.fillCircle(p.x, p.y + 3, width * 0.22));
    },

    /** Nehrin üstüne, akışa dik ahşap köprü */
    drawBridge(scene, x, y, angle, riverWidth) {
      const length = riverWidth + 54;
      const g = scene.add.graphics({ x, y }).setDepth(-3);
      g.rotation = angle + Math.PI / 2; // akışa dik
      g.fillStyle(0x000000, 0.25).fillRect(-length / 2 + 4, -18 + 6, length, 36);
      g.fillStyle(0x7a5532).fillRect(-length / 2, -18, length, 36);
      g.lineStyle(2, 0x553a20, 1);
      for (let px = -length / 2 + 8; px < length / 2; px += 9) g.lineBetween(px, -18, px, 18);
      g.fillStyle(0x4a321c).fillRect(-length / 2, -21, length, 5).fillRect(-length / 2, 16, length, 5); // korkuluk
      return g;
    },

    // ================================================================ //
    //  KANYON (platoyu yaran akarsu vadisi) + GEÇİT
    // ================================================================ //

    /**
     * Platonun üstünden bakınca derin bir yarık: dışta plato kenarı (açık),
     * içe doğru katman katman kaya duvarları (tabakalar), dipte dere ya da kuru yatak.
     * @param {{x,y}[]} points eğri üzerindeki örnek noktalar
     * @param {{rim:number, wall:number[], floor:number, stream:number|null}} pal
     */
    drawCanyon(g, points, width, pal) {
      const layers = [
        [width / 2 + 16, pal.rim],
        [width / 2 + 6, pal.wall[0]],
        [width / 2 - 4, pal.wall[1]],
        [width / 2 - 14, pal.wall[2]],
        [width / 2 - 26, pal.floor],
      ];
      // Not: yarı saydam daireler üst üste binince koyulaşır (simsiyah olur);
      // bu yüzden her katman OPAK renkle çizilir.
      layers.forEach(([r, color], i) => {
        g.fillStyle(color, 1);
        // Alt katmanlar hafif aşağı kayar: kuzey duvarı gölgede, güney duvarı güneşte görünür
        const dy = i >= 3 ? 4 : 0;
        points.forEach((p) => g.fillCircle(p.x, p.y + dy, r));
      });
      if (pal.stream !== null) {
        g.fillStyle(pal.stream, 0.95);
        points.forEach((p) => g.fillCircle(p.x, p.y, 7));
      }
    },

    /** Kanyona inen/çıkan patika (geçit): akışa dik, toprak rengi basamaklı yol */
    drawPass(scene, x, y, angle, canyonWidth, color) {
      const length = canyonWidth + 70;
      const g = scene.add.graphics({ x, y }).setDepth(-3);
      g.rotation = angle + Math.PI / 2;
      g.fillStyle(0x000000, 0.18).fillRoundedRect(-length / 2 + 3, -22 + 5, length, 44, 14);
      g.fillStyle(color, 1).fillRoundedRect(-length / 2, -22, length, 44, 14);
      g.lineStyle(2, 0x000000, 0.18);
      for (let px = -length / 2 + 14; px < length / 2 - 8; px += 11) g.lineBetween(px, -18, px, 18); // basamaklar
      return g;
    },

    // ================================================================ //
    //  TARLALAR (ovada tarım)
    // ================================================================ //

    /**
     * @param {'grain'|'rice'|'orchard'} kind
     *   grain  : sarı-yeşil buğday/pamuk şeritleri (Nil, Akdeniz)
     *   rice   : su dolu çeltik havuzları (muson)
     *   orchard: sıra sıra ağaç (narenciye/zeytin bahçesi)
     */
    drawField(g, x, y, w, h, kind) {
      g.fillStyle(0x000000, 0.12).fillRect(x + 3, y + 3, w, h);
      if (kind === 'rice') {
        g.fillStyle(0x6fa04a, 1).fillRect(x, y, w, h);
        g.fillStyle(0x4f8fb0, 0.55);
        for (let i = 0; i < 3; i++) g.fillRect(x + 4, y + 4 + (i * (h - 8)) / 3, w - 8, (h - 8) / 3 - 4);
        g.lineStyle(2, 0x8fbf5a, 0.9);
        for (let px = x + 10; px < x + w - 4; px += 10) g.lineBetween(px, y + 4, px, y + h - 4);
      } else if (kind === 'orchard') {
        g.fillStyle(0x9a8a4a, 1).fillRect(x, y, w, h);
        for (let px = x + 10; px < x + w - 4; px += 16) {
          for (let py = y + 10; py < y + h - 4; py += 16) {
            g.fillStyle(0x2f6a2a, 1).fillCircle(px, py, 6);
            g.fillStyle(0xf0a030, 1).fillCircle(px + 2, py - 2, 1.5);
          }
        }
      } else {
        const colors = [0xc9b65a, 0x8fae4a];
        g.fillStyle(colors[Math.floor(Math.random() * 2)], 1).fillRect(x, y, w, h);
        g.lineStyle(2, 0x000000, 0.12);
        for (let py = y + 6; py < y + h; py += 7) g.lineBetween(x, py, x + w, py);
      }
      g.lineStyle(2, 0x6b5536, 0.6).strokeRect(x, y, w, h); // tarla sınırı
    },

    // ================================================================ //
    //  KUM TEPESİ
    // ================================================================ //

    drawDune(g, x, y, w, base) {
      const light = Phaser.Display.Color.IntegerToColor(base).brighten(12).color;
      const dark = Phaser.Display.Color.IntegerToColor(base).darken(14).color;
      g.fillStyle(dark, 0.55).fillEllipse(x + w * 0.08, y + w * 0.06, w, w * 0.42);
      g.fillStyle(light, 0.6).fillEllipse(x - w * 0.06, y - w * 0.04, w * 0.9, w * 0.32);
      // Rüzgârın oluşturduğu sırt çizgisi
      g.lineStyle(2, dark, 0.5);
      g.beginPath();
      g.arc(x, y + w * 0.3, w * 0.5, Math.PI * 1.2, Math.PI * 1.8);
      g.strokePath();
    },

    // ================================================================ //
    //  KENAR SİSİ
    // ================================================================ //

    drawEdgeFog(g, width, height, color) {
      const band = 90;
      const steps = 9;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const inset = t * band;
        g.fillStyle(color, 0.12 * (1 - t));
        g.fillRect(0, inset, width, band / steps);                   // üst
        g.fillRect(0, height - inset - band / steps, width, band / steps); // alt
        g.fillRect(inset, 0, band / steps, height);                  // sol
        g.fillRect(width - inset - band / steps, 0, band / steps, height); // sağ
      }
    },
  };

  // ==================================================================== //
  //  Yardımcı fonksiyonlar
  // ==================================================================== //

  /** Merkez etrafında, yarıçapı rastgele oynayan çokgen noktaları */
  function jaggedPolygon(cx, cy, r, count, jitter) {
    const pts = [];
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      const rr = r * (1 - jitter / 2 + Math.random() * jitter);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    return pts;
  }

  /**
   * Periyodik değer gürültüsü: `cells` x `cells` rastgele ızgara, yumuşak
   * aradeğerleme ile `size` x `size` piksele yayılır. Kenarlar sarmalandığı
   * (wrap) için doku döşendiğinde dikiş izi görünmez.
   */
  function periodicNoise(size, cells) {
    const grid = [];
    for (let i = 0; i < cells * cells; i++) grid.push(Math.random());
    const at = (gx, gy) => grid[((gy + cells) % cells) * cells + ((gx + cells) % cells)];
    const smooth = (t) => t * t * (3 - 2 * t);
    const out = new Float32Array(size * size);
    const step = size / cells;

    for (let y = 0; y < size; y++) {
      const gy = Math.floor(y / step);
      const ty = smooth(y / step - gy);
      for (let x = 0; x < size; x++) {
        const gx = Math.floor(x / step);
        const tx = smooth(x / step - gx);
        const top = at(gx, gy) * (1 - tx) + at(gx + 1, gy) * tx;
        const bottom = at(gx, gy + 1) * (1 - tx) + at(gx + 1, gy + 1) * tx;
        out[y * size + x] = top * (1 - ty) + bottom * ty;
      }
    }
    return out;
  }

  function hexToRgb(hex) {
    return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
  }

  function clamp255(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  GS.TerrainPainter = TerrainPainter;
})(window.GS = window.GS || {});
