/**
 * ============================================================================
 *  GeoStrand — Açılış Sahnesi (BootScene)
 * ============================================================================
 *  Oyunun tüm görsellerini KODLA üretir (generateTexture). Böylece proje
 *  hiçbir resim dosyasına ihtiyaç duymaz ve tek klasörle çalışır.
 *
 *  Kendi çizimlerinizi kullanmak isterseniz: preload() içinde
 *    this.load.image('player', 'assets/player.png');
 *  yazın ve ilgili _make... fonksiyonunu silin. Anahtar adları aynı kalırsa
 *  oyunun geri kalanında hiçbir şey değişmez.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  class BootScene extends Phaser.Scene {
    constructor() {
      super('BootScene');
    }

    create() {
      // Oyuncu dokusu GameScene'de, seçilen görünüme göre CharacterRenderer ile üretilir.
      this._makeTrees();
      this._makeSoil();
      this._makeSunStick();
      this._makeInstruments();
      this._makeParticles();
      this._makeDecor();
      this._makeLight();
      this.scene.start('GameScene');
    }

    /** Yardımcı: geçici bir Graphics ile çiz, dokuya çevir, temizle */
    _draw(key, w, h, drawFn) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      drawFn(g);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    // -------------------------------------------------------------- Ağaçlar
    _makeTrees() {
      // Geniş yapraklı (Ekvatoral / Muson)
      this._draw('tree_broadleaf', 64, 64, (g) => {
        g.fillStyle(0x000000, 0.25).fillEllipse(34, 52, 50, 16);
        g.fillStyle(0x5a3a1e).fillRect(29, 38, 7, 16);
        g.fillStyle(0x1f5a22).fillCircle(22, 28, 16).fillCircle(42, 28, 16).fillCircle(32, 18, 16);
        g.fillStyle(0x2f7d33).fillCircle(26, 24, 10).fillCircle(40, 22, 9);
      });

      // Hurma (Çöl vahası)
      this._draw('tree_palm', 64, 64, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(34, 54, 36, 12);
        g.fillStyle(0x8a6234).fillRect(30, 30, 5, 24);
        g.lineStyle(6, 0x3f8f3a);
        [[8, 18], [56, 18], [14, 38], [52, 38], [32, 6], [20, 8], [46, 8]].forEach(([x, y]) => {
          g.beginPath(); g.moveTo(32, 26); g.lineTo(x, y); g.strokePath();
        });
        g.fillStyle(0x6b4423).fillCircle(32, 26, 5);
      });

      // Kaktüs (Atacama)
      this._draw('tree_cactus', 44, 56, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(22, 50, 30, 10);
        g.fillStyle(0x3d8a4a).fillRoundedRect(17, 8, 10, 42, 5);
        g.fillRoundedRect(5, 20, 8, 16, 4).fillRoundedRect(31, 14, 8, 18, 4);
        g.fillRect(9, 32, 10, 5).fillRect(25, 28, 10, 5);
        g.fillStyle(0x5fb06c).fillRect(20, 10, 2, 38);
      });

      // Zeytin (Akdeniz)
      this._draw('tree_olive', 56, 56, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(30, 46, 42, 14);
        g.fillStyle(0x6d5a44).fillRect(25, 32, 6, 14);
        g.fillStyle(0x7c8f5a).fillCircle(18, 24, 12).fillCircle(38, 24, 12).fillCircle(28, 15, 12);
        g.fillStyle(0xa3b07c).fillCircle(22, 20, 5).fillCircle(36, 18, 4).fillCircle(30, 27, 4);
      });

      // İğne yapraklı (Tayga / Sert Karasal)
      this._draw('tree_conifer', 48, 64, (g) => {
        g.fillStyle(0x000000, 0.25).fillEllipse(26, 56, 34, 12);
        g.fillStyle(0x4a3220).fillRect(21, 46, 6, 12);
        g.fillStyle(0x163d2a).fillTriangle(24, 4, 4, 50, 44, 50);
        g.fillStyle(0x1f5238).fillTriangle(24, 10, 9, 38, 39, 38);
        g.fillStyle(0xe9f1f2).fillTriangle(24, 4, 18, 16, 30, 16); // karlı uç
      });

      // Akasya: düz, şemsiye biçimli tepe (çöl ve savan)
      this._draw('tree_acacia', 72, 56, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(38, 48, 56, 12);
        g.fillStyle(0x6b4a2a).fillRect(34, 22, 5, 26);
        g.lineStyle(3, 0x6b4a2a).lineBetween(36, 30, 24, 20).lineBetween(37, 28, 50, 19);
        g.fillStyle(0x6f8a3a).fillEllipse(36, 17, 62, 18);
        g.fillStyle(0x8aa64a).fillEllipse(32, 14, 40, 9);
      });

      // Alçak çalı (Fynbos / Tundra)
      this._draw('tree_shrub', 44, 36, (g) => {
        g.fillStyle(0x000000, 0.2).fillEllipse(22, 28, 38, 10);
        g.fillStyle(0x6f7f4a).fillCircle(12, 20, 9).fillCircle(30, 20, 9).fillCircle(21, 14, 9);
        g.fillStyle(0x9aa86c).fillCircle(17, 15, 3).fillCircle(28, 17, 3);
      });
    }

    // -------------------------------------------------------------- Toprak
    /** Gri tonlu çizilir; WorldBuilder konuma göre setTint ile renklendirir. */
    _makeSoil() {
      this._draw('soil', 60, 44, (g) => {
        g.fillStyle(0xbdbdbd).fillEllipse(30, 22, 58, 40);
        g.fillStyle(0x9a9a9a).fillEllipse(30, 22, 44, 28);
        g.fillStyle(0xffffff, 0.6);
        for (let i = 0; i < 14; i++) g.fillCircle(10 + Math.random() * 40, 10 + Math.random() * 24, 1.6);
        g.fillStyle(0x6a6a6a).fillRect(40, 8, 3, 14);  // küçük kürek sapı
        g.fillStyle(0xd0d0d0).fillRect(37, 20, 9, 7);  // kürek ağzı
      });
    }

    // -------------------------------------------------------------- Güneş çubuğu
    _makeSunStick() {
      this._draw('sunstick', 20, 48, (g) => {
        g.fillStyle(0xd9d2c0).fillCircle(10, 42, 7);   // taban taşı
        g.fillStyle(0x7a5530).fillRect(8, 4, 4, 40);   // çubuk
        g.fillStyle(0xd94b3c).fillRect(8, 4, 4, 6);    // kırmızı tepe (görünürlük)
      });
    }

    // -------------------------------------------------------------- Yeni ipucu nesneleri
    _makeInstruments() {
      // Yükselti ölçer: üç ayak üzerinde ölçüm aleti (teodolit) + küçük anten
      this._draw('altimeter', 40, 52, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(20, 47, 30, 8);
        g.lineStyle(3, 0x4a3a2a);
        g.lineBetween(20, 22, 8, 46).lineBetween(20, 22, 32, 46).lineBetween(20, 22, 20, 47);
        g.fillStyle(0xf2c230).fillRoundedRect(10, 10, 20, 13, 3);
        g.fillStyle(0x203040).fillRoundedRect(13, 13, 9, 7, 2);   // ekran
        g.fillStyle(0x6fe38a).fillRect(14, 16, 7, 1.5);           // ekrandaki çizgi
        g.fillStyle(0x2b2b2b).fillCircle(26, 16, 2.5);            // mercek
        g.lineStyle(2, 0x2b2b2b).lineBetween(18, 10, 15, 2);       // anten
        g.fillStyle(0xd94b3c).fillCircle(15, 2, 2);
      });

      // Hayvan izleri: yumuşak toprak lekesi üzerinde pati izleri
      this._draw('tracks', 64, 40, (g) => {
        g.fillStyle(0x6b5a44, 0.55).fillEllipse(32, 20, 62, 36);
        g.fillStyle(0x3a2e22, 0.85);
        [[12, 28], [24, 20], [36, 26], [48, 16]].forEach(([x, y]) => {
          g.fillEllipse(x, y, 7, 6);                               // taban
          g.fillCircle(x - 3.5, y - 5, 1.8).fillCircle(x, y - 6.5, 1.8).fillCircle(x + 3.5, y - 5, 1.8); // parmaklar
        });
      });

      // Yardım sandığı: paraşütle atılmış tahta kutu
      this._draw('crate', 40, 40, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(21, 35, 34, 8);
        g.fillStyle(0x9a6a3a).fillRect(6, 10, 28, 24);
        g.lineStyle(2, 0x6b4625).strokeRect(6, 10, 28, 24).lineBetween(6, 10, 34, 34).lineBetween(34, 10, 6, 34);
        g.fillStyle(0xffffff).fillRect(15, 18, 10, 8);              // beyaz etiket
        g.fillStyle(0xd94b3c).fillRect(19, 19, 2, 6).fillRect(17, 21, 6, 2); // kırmızı artı
        g.fillStyle(0xf2efe6, 0.9).fillTriangle(6, 10, 20, 2, 34, 10); // paraşüt kumaşı
      });

      // Açılmış sandık: kapak yana devrik, içi boş
      this._draw('crate_open', 40, 40, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(21, 35, 34, 8);
        g.fillStyle(0x5e3f20).fillRect(6, 14, 28, 20);                 // iç (gölgeli)
        g.fillStyle(0x9a6a3a).fillRect(6, 22, 28, 12);                 // ön yüz
        g.lineStyle(2, 0x6b4625).strokeRect(6, 14, 28, 20);
        g.fillStyle(0x9a6a3a).fillRect(26, 4, 12, 10);                 // devrik kapak
        g.lineStyle(2, 0x6b4625).strokeRect(26, 4, 12, 10);
      });
    }

    // -------------------------------------------------------------- Hava parçacıkları
    _makeParticles() {
      this._draw('p_rain', 4, 18, (g) => g.fillStyle(0xd6e8f8, 1).fillRect(1, 0, 2.2, 18));
      this._draw('p_snow', 6, 6, (g) => g.fillStyle(0xffffff, 1).fillCircle(3, 3, 2.6));
      this._draw('p_dust', 14, 3, (g) => g.fillStyle(0xe2c08a, 0.9).fillRect(0, 0, 14, 2));
      // Sandık açılınca saçılan parıltı (dört köşeli yıldız)
      this._draw('p_spark', 12, 12, (g) => {
        g.fillStyle(0xffffff, 1).fillTriangle(6, 0, 7.5, 6, 4.5, 6).fillTriangle(6, 12, 7.5, 6, 4.5, 6)
          .fillTriangle(0, 6, 6, 4.5, 6, 7.5).fillTriangle(12, 6, 6, 4.5, 6, 7.5);
      });
    }

    // -------------------------------------------------------------- Süsler
    _makeDecor() {
      this._draw('decor_grass', 16, 12, (g) => {
        g.lineStyle(2, 0x3f6f2a);
        [[3, 2], [8, 0], [13, 3]].forEach(([x, y]) => { g.beginPath(); g.moveTo(8, 12); g.lineTo(x, y); g.strokePath(); });
      });
      this._draw('decor_bush', 20, 16, (g) => {
        g.fillStyle(0x24521f).fillCircle(6, 10, 6).fillCircle(14, 10, 6).fillCircle(10, 6, 6);
      });
      this._draw('decor_rock', 18, 14, (g) => {
        g.fillStyle(0x7d7a74).fillEllipse(9, 8, 16, 11);
        g.fillStyle(0xa19d95).fillEllipse(7, 6, 7, 4);
      });
      this._draw('decor_dune', 40, 14, (g) => {
        g.lineStyle(2, 0xb48b45, 0.8);
        g.beginPath(); g.arc(20, 18, 16, Math.PI * 1.15, Math.PI * 1.85); g.strokePath();
      });
      this._draw('decor_snow', 34, 20, (g) => {
        g.fillStyle(0xf2f6f8, 0.9).fillEllipse(17, 10, 32, 16);
      });
      this._draw('decor_puddle', 30, 16, (g) => {
        g.fillStyle(0x3b6c8a, 0.7).fillEllipse(15, 8, 28, 13);
        g.fillStyle(0x9cc6dd, 0.6).fillEllipse(11, 6, 8, 3);
      });
      // Eğrelti otu (tropik orman tabanı)
      this._draw('decor_fern', 26, 20, (g) => {
        g.lineStyle(3, 0x2f7a35);
        [[2, 6], [8, 1], [18, 1], [24, 6], [13, 0]].forEach(([x, y]) => { g.beginPath(); g.moveTo(13, 19); g.lineTo(x, y); g.strokePath(); });
      });
      // Kır çiçekleri
      this._draw('decor_flower', 18, 14, (g) => {
        g.lineStyle(1.5, 0x3f6f2a).lineBetween(5, 13, 5, 6).lineBetween(12, 13, 12, 4);
        g.fillStyle(0xf4d35e).fillCircle(5, 5, 3);
        g.fillStyle(0xe76f8a).fillCircle(12, 4, 3);
      });
      // Çakıl taşları
      this._draw('decor_pebble', 18, 10, (g) => {
        g.fillStyle(0x9b8466).fillEllipse(4, 6, 6, 4).fillEllipse(11, 4, 5, 3).fillEllipse(14, 8, 4, 3);
      });
      // Kuru çalı
      this._draw('decor_dryshrub', 22, 16, (g) => {
        g.lineStyle(1.5, 0x7a6038);
        [[2, 3], [7, 0], [14, 1], [20, 4], [11, 2]].forEach(([x, y]) => { g.beginPath(); g.moveTo(11, 15); g.lineTo(x, y); g.strokePath(); });
      });
      // Saz (göl kıyısı)
      this._draw('decor_reed', 18, 26, (g) => {
        g.lineStyle(2, 0x557a3a);
        [[3, 2], [9, 0], [15, 3]].forEach(([x, y]) => { g.beginPath(); g.moveTo(9, 25); g.lineTo(x, y); g.strokePath(); });
        g.fillStyle(0x6b4a2a).fillRoundedRect(7, 2, 4, 9, 2);
      });
      // Yosun / liken (tundra)
      this._draw('decor_moss', 22, 14, (g) => {
        g.fillStyle(0x7d8f4a, 0.9).fillCircle(6, 8, 5).fillCircle(14, 7, 6);
        g.fillStyle(0xc9c27a, 0.8).fillCircle(10, 6, 3);
      });
      // Büyük kaya (engel)
      this._draw('boulder', 44, 34, (g) => {
        g.fillStyle(0x000000, 0.22).fillEllipse(24, 27, 40, 12);
        g.fillStyle(0x6c6a66).fillPoints([{ x: 4, y: 24 }, { x: 8, y: 9 }, { x: 20, y: 3 }, { x: 34, y: 6 }, { x: 41, y: 18 }, { x: 37, y: 28 }, { x: 12, y: 30 }], true);
        g.fillStyle(0x8e8b85).fillPoints([{ x: 9, y: 11 }, { x: 20, y: 5 }, { x: 31, y: 8 }, { x: 22, y: 16 }, { x: 11, y: 18 }], true);
        g.lineStyle(1.5, 0x4d4b47, 0.7).lineBetween(22, 16, 30, 26);
      });
    }

    // -------------------------------------------------------------- Fener ışığı
    /** Ortası opak, kenarları şeffaf radyal gradyan (Canvas API ile) */
    _makeLight() {
      const size = 256;
      const tex = this.textures.createCanvas('light', size, size);
      const ctx = tex.getContext();
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }

  GS.BootScene = BootScene;
})(window.GS = window.GS || {});
