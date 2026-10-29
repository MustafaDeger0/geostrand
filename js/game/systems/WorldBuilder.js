/**
 * ============================================================================
 *  GeoStrand — Dünya Kurucu (WorldBuilder)
 * ============================================================================
 *  Bir konum verisinden oynanabilir haritayı kurar. YERLEŞTİRME SIRASI önemli:
 *  büyük yer şekilleri önce konur, küçükler kalan boş alanlara yerleşir.
 *
 *    1) Zemin dokusu + büyük renk bölgeleri          (görsel)
 *    2) Nehir + köprü YA DA kanyon + geçit           (engel, tek geçiş noktası)
 *    3) Dağ kümeleri                                 (engel)
 *    4) Göller / vaha / donmuş göl                   (engel)
 *    5) Tarlalar (ovada) ve kum tepeleri             (görsel)
 *    6) Büyük kayalar                                (engel)
 *    7) İpucu nesneleri (kademeye göre 3–5) + yardım sandıkları
 *    8) Atmosfer ağaçları, süs nesneleri, kenar sisi
 *
 *  ARAZİ = İKLİM + YER ŞEKLİ (landforms.js):
 *    Ova  → dağ yok, nehir ve tarlalar          (alçak + düz)
 *    Plato→ derin kanyon + geçit, az tepe       (yüksek + düz, akarsuyla yarılmış)
 *    Dağ  → çok sayıda zirve, yüksekte karlı    (yüksek + dik)
 *
 *  "blockers" listesi: dolu alanları daire olarak tutar; yeni bir şey
 *  yerleştirilirken bu dairelerle çakışmaması kontrol edilir.
 *
 *  build() bir "World" nesnesi döndürür; destroy() ile tamamen temizlenir.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const TP = () => GS.TerrainPainter;

  class WorldBuilder {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config CONFIG.WORLD
     */
    constructor(scene, config) {
      this.scene = scene;
      this.cfg = config;
    }

    /**
     * @param {object} location GS.LOCATIONS öğesi
     * @param {Object<string, object>} clues ClueFactory.build() çıktısı (id → ipucu)
     * @param {{x:number, y:number}} spawn Oyuncunun doğduğu nokta
     * @param {{crates?:number}} [options] kademe ayarları
     */
    build(location, clues, spawn, { crates = 0 } = {}) {
      const scene = this.scene;
      const climate = GS.CLIMATES[location.climate];
      const terrain = this._terrainFor(location, climate);

      // --- Bu kurulumun durum değişkenleri ---------------------------------
      this.created = [];       // destroy() için oluşturulan her şey
      this.blockers = [];      // yerleşim için dolu alanlar {x, y, r}
      this.solids = [];        // süs nesnelerinin üstüne konmayacağı katı alanlar
      this.water = [];         // ses için su daireleri {x, y, r}
      this.channel = null;     // nehir ya da kanyon eğrisi (tarlalar yanına dizilir)
      this.obstacles = scene.physics.add.staticGroup();
      this.shines = [];
      this.spawn = spawn;
      this.blockers.push({ x: spawn.x, y: spawn.y, r: 120 }); // doğuş noktası hep boş

      // 1) Zemin
      this._buildGround(climate, location);

      // 2–6) Yer şekilleri (iklim + yer şekli birlikte belirler)
      // Sayılar 1600x1200 alan içindir; büyük haritada alanla orantılı çoğalır.
      const areaScale = (this.cfg.width * this.cfg.height) / this.cfg.terrainBaseArea;
      const count = (n) => Math.round(n * areaScale);
      if (terrain.canyon) this._buildChannel('canyon', climate);
      else if (terrain.river) this._buildChannel(terrain.lakeStyle === 'frozen' ? 'frozenRiver' : 'river', climate);
      for (let i = 0; i < count(terrain.mountains); i++) this._buildMountainCluster(terrain.mountainStyle);
      for (let i = 0; i < count(terrain.lakes); i++) this._buildLake(terrain.lakeStyle, location);
      if (terrain.fields) this._buildFields(terrain.fields);
      this._buildDunes(count(terrain.dunes), climate.groundColor);
      for (let i = 0; i < count(terrain.boulders); i++) this._buildBoulder();

      // Yürünebilir alan haritası: ipucu ve sandık yalnızca yürüyerek ulaşılabilen yere konur
      // (ör. plato kanyonunun öbür yakasında, dağlarla çevrili bir cepte kalmasın)
      this._buildWalkMap();

      // 7) İpucu nesneleri (kademeye göre 3–5 adet)
      const treeTexture = `tree_${location.treeStyle}`;
      const ring = { minFromSpawn: this.cfg.clueMinDistance, maxFromSpawn: this.cfg.clueMaxDistance };
      const TEX = { tree: treeTexture, soil: 'soil', sunstick: 'sunstick', altimeter: 'altimeter', fauna: 'tracks' };
      const interactables = Object.values(clues).map((clue) => {
        const p = this._reserve(clue.id === 'tree' ? 45 : 40, { ...ring, reachable: true });
        const obj = this._track(new GS.Interactable(scene, p.x, p.y, {
          type: clue.id,
          texture: TEX[clue.id],
          prompt: GS.ClueFactory.TYPES[clue.id].prompt,
          clue,
          tint: clue.id === 'soil' ? location.soilColor : undefined,
        }));
        if (clue.id === 'tree') this._addObstacle(obj, 0.22);
        if (clue.id === 'sunstick' || clue.id === 'altimeter') this._addObstacle(obj, 0.3);
        return obj;
      });
      const stick = interactables.find((o) => o.type === 'sunstick');
      const shadow = this._track(this._drawStickShadow(stick, location));

      // Yardım sandıkları: uzakta, keşfetmeye değer
      const crateObjs = [];
      if (crates) this._buildWalkMap(); // ipucu nesneleri de engel oldu: haritayı tazele
      for (let i = 0; i < crates; i++) {
        const p = this._reserve(34, { minFromSpawn: 380, maxFromSpawn: 950, reachable: true }, true);
        if (!p) continue;
        const crate = this._track(new GS.Interactable(scene, p.x, p.y, {
          type: 'crate', texture: 'crate', prompt: 'Sandığı aç', clue: null, marker: { text: '!', color: '#ff8a3d' },
        }));
        this._addObstacle(crate, 0.32);
        crateObjs.push(crate);
      }

      // 8) Atmosfer ağaçları, süsler, sis
      const extraTrees = Math.round(this.cfg.extraTreeCount * (terrain.treeDensity ?? 1));
      for (let i = 0; i < extraTrees; i++) {
        const p = this._reserve(40, { minFromSpawn: 130 }, true);
        if (!p) continue;
        const deco = this._track(scene.add.image(p.x, p.y, treeTexture).setDepth(p.y).setScale(Phaser.Math.FloatBetween(0.8, 1.05)));
        this._addObstacle(deco, 0.22);
      }
      this._buildDecor(climate);
      const fog = this._track(scene.add.graphics().setDepth(3800));
      TP().drawEdgeFog(fog, this.cfg.width, this.cfg.height, Phaser.Display.Color.IntegerToColor(climate.groundColor).darken(40).color);

      // Su parıltıları yavaşça yanıp söner
      this.shines.forEach((s) => {
        scene.tweens.add({
          targets: s, alpha: { from: 0.1, to: 0.6 }, scaleX: { from: 0.8, to: 1.15 },
          duration: Phaser.Math.Between(1400, 2600), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 1500),
        });
      });

      // --- World nesnesi ---------------------------------------------------
      const created = this.created;
      const obstacles = this.obstacles;
      const water = this.water;
      const shines = this.shines;
      return {
        location,
        terrain,
        interactables,           // ipucu nesneleri
        crates: crateObjs,       // yardım sandıkları
        obstacles,
        /** Her karede: güneş çubuğu gölgesi ışığa göre görünür/kaybolur */
        update(lightLevel) {
          shadow.setAlpha(lightLevel);
        },
        /** En yakın (donmamış) suya olan uzaklık; ses sistemi için */
        distanceToWater(x, y) {
          let best = Infinity;
          for (const w of water) best = Math.min(best, Math.hypot(x - w.x, y - w.y) - w.r);
          return Math.max(0, best);
        },
        destroy() {
          scene.tweens.killTweensOf(shines);
          obstacles.destroy(false);
          created.forEach((obj) => obj.destroy());
        },
      };
    }

    /**
     * Konuma ait, önbelleğe alınan dokuları önceden üret.
     * Çevrim içi yarışta harita tohumla kurulmadan ÖNCE çağrılır: doku bir
     * oyuncuda hazır, diğerinde yoksa rastgele sayı dizisi kayar ve haritalar
     * farklılaşırdı.
     */
    prepare(location) {
      const climate = GS.CLIMATES[location.climate];
      TP().makeGroundTexture(this.scene, `ground_${climate.key}`, climate.groundColor, climate.groundColor2);
    }

    /**
     * İklimin arazi ayarlarına yer şeklinin etkisini uygular.
     *   OVA  : dağ yok, nehir + tarlalar
     *   PLATO: platoyu yaran kanyon, birkaç kayalık tepe
     *   DAG  : çok sayıda zirve; yükseklerde karlı dağlar
     */
    _terrainFor(location, climate) {
      const base = { ...climate.terrain };
      const lf = GS.LANDFORMS[location.landform].terrain;
      const t = { ...base };
      t.mountains = Math.round(base.mountains * (lf.mountainsMul ?? 1) + (lf.mountainsAdd || 0));
      if (lf.river !== undefined) t.river = lf.river;
      t.canyon = !!lf.canyon;
      t.boulders = Math.round(base.boulders * (lf.bouldersMul ?? 1));
      t.lakes = base.lakes + (lf.lakesAdd || 0);
      if (location.landform === 'DAG') t.lakes = Math.min(t.lakes, 1);
      // Ova tarımı: iklime göre tarla türü (soğuk iklimlerde ve yağmur ormanında tarla yok)
      const FIELD_KIND = { COL: 'grain', AKDENIZ: 'orchard', MUSON: 'rice' };
      t.fields = lf.fields ? FIELD_KIND[location.climate] || null : null;
      // Dağ tarzı: 2000 m üstünde (çöl hariç) karlı zirveler
      if (location.landform === 'DAG' && location.elevation >= 2000 && location.climate !== 'COL') t.mountainStyle = 'snowy';
      if (location.landform === 'DAG' && t.mountainStyle === 'mesa') t.mountainStyle = 'limestone';
      // Dağlıkta ağaç biraz daha seyrek
      t.treeDensity = location.landform === 'DAG' ? 0.7 : 1;
      return t;
    }

    // ================================================================== //
    //  1) ZEMİN
    // ================================================================== //
    _buildGround(climate, location) {
      const { width, height } = this.cfg;
      const key = `ground_${climate.key}`;
      TP().makeGroundTexture(this.scene, key, climate.groundColor, climate.groundColor2);
      const ground = this._track(this.scene.add.tileSprite(0, 0, width, height, key).setOrigin(0).setDepth(-20));
      // Yüksek yerler (plato, dağ) biraz daha açık ve soluk; ova daha doygun
      if (location.landform !== 'OVA') ground.setTint(0xeeeeee);

      // Büyük ölçekli bölgeler: kar örtüsü, kuru toprak, koyu çimen...
      // Yumuşak kenarlı radyal gradyan dokusu ('light') renklendirilip esnetilir.
      for (let i = 0; i < 18; i++) {
        const size = Phaser.Math.Between(260, 520) / 256;
        this._track(
          this.scene.add
            .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'light')
            .setTint(climate.patchColor)
            .setAlpha(Phaser.Math.FloatBetween(0.3, 0.5))
            .setScale(size * Phaser.Math.FloatBetween(0.9, 1.6), size * Phaser.Math.FloatBetween(0.6, 1))
            .setRotation(Math.random() * Math.PI)
            .setDepth(-15)
        );
      }
    }

    // ================================================================== //
    //  2) NEHİR / DONMUŞ NEHİR / KANYON
    // ================================================================== //
    /**
     * Haritayı baştan başa kesen bir "kanal". Tek bir geçiş noktası vardır:
     *   river / frozenRiver → ahşap köprü
     *   canyon              → kanyona inip çıkan patika (geçit)
     * @param {'river'|'frozenRiver'|'canyon'} kind
     */
    _buildChannel(kind, climate) {
      const { width, height } = this.cfg;
      const canyon = kind === 'canyon';
      const channelWidth = canyon ? 120 : 70;
      // Haritanın üst ya da alt bandından geçer (doğuş noktasından uzak)
      const baseY = Math.random() < 0.5
        ? Phaser.Math.Between(Math.round(height * 0.14), Math.round(height * 0.28))
        : Phaser.Math.Between(Math.round(height * 0.72), Math.round(height * 0.86));
      const ctrl = [-80, 0.2, 0.4, 0.6, 0.8, width + 80].map((x, i) =>
        new Phaser.Math.Vector2(i === 0 || i === 5 ? x : x * width, baseY + Phaser.Math.Between(-110, 110)));
      const curve = new Phaser.Curves.Spline(ctrl);
      const points = curve.getSpacedPoints(Math.ceil(curve.getLength() / 8));
      this.channel = { points, width: channelWidth };

      const g = this._track(this.scene.add.graphics().setDepth(-6));
      if (canyon) {
        const desert = climate.key === 'COL';
        const cold = climate.terrain.lakeStyle === 'frozen';
        TP().drawCanyon(g, points, channelWidth, {
          rim: desert ? 0xe0b878 : 0xa59a84,
          wall: desert ? [0xc0703a, 0xa0502c, 0x7c3a22] : [0x8a7e6c, 0x6e6454, 0x52493d],
          floor: desert ? 0xb07a4a : 0x7a705e,
          stream: desert ? null : cold ? 0xcfe6ef : 0x3f86b8,
        });
      } else {
        TP().drawRiver(g, points, channelWidth, kind === 'frozenRiver' ? 'frozen' : 'water');
      }

      // Geçiş noktası: doğuş noktasının yatay hizasına yakın
      const crossX = this.spawn.x + Phaser.Math.Between(-260, 260);
      let ci = 0;
      points.forEach((p, i) => { if (Math.abs(p.x - crossX) < Math.abs(points[ci].x - crossX)) ci = i; });
      const cp = points[ci];
      const tangent = curve.getTangent(ci / (points.length - 1));
      const angle = Math.atan2(tangent.y, tangent.x);
      if (canyon) {
        this._track(TP().drawPass(this.scene, cp.x, cp.y, angle, channelWidth, climate.key === 'COL' ? 0xd2a46a : 0x9c8f78));
      } else {
        this._track(TP().drawBridge(this.scene, cp.x, cp.y, angle, channelWidth));
      }

      // Çarpışma + yerleşim engeli (geçidin çevresi hariç)
      const gap = canyon ? 60 : 52;
      points.forEach((p, i) => {
        if (i % 3 !== 0) return;
        const nearCross = Math.hypot(p.x - cp.x, p.y - cp.y) < gap;
        if (!nearCross) this._addCircleBlocker(p.x, p.y, channelWidth / 2 - 4);
        this.blockers.push({ x: p.x, y: p.y, r: channelWidth / 2 + 22 });
        this.solids.push({ x: p.x, y: p.y, r: channelWidth / 2 + 10 });
        if (kind === 'river') this.water.push({ x: p.x, y: p.y, r: channelWidth / 2 });
      });
      // Geçidin iki ucu boş kalsın (önüne ağaç konmasın)
      this.blockers.push({ x: cp.x, y: cp.y, r: canyon ? 110 : 80 });
    }

    // ================================================================== //
    //  TARLALAR (ova)
    // ================================================================== //
    /** Ovada tarla parselleri; nehir varsa kıyısına dizilir (alüvyon = verimli toprak) */
    _buildFields(kind) {
      const g = this._track(this.scene.add.graphics().setDepth(-9));
      const plots = Phaser.Math.Between(6, 9);
      for (let i = 0; i < plots; i++) {
        const w = Phaser.Math.Between(90, 150);
        const h = Phaser.Math.Between(60, 100);
        let p = null;
        if (this.channel && i < plots - 2) {
          // Nehir kıyısına yakın bir nokta
          const q = Phaser.Utils.Array.GetRandom(this.channel.points);
          const side = Math.random() < 0.5 ? -1 : 1;
          const candidate = { x: q.x - w / 2, y: q.y + side * (this.channel.width / 2 + 30 + h / 2) - h / 2 };
          const c = { x: candidate.x + w / 2, y: candidate.y + h / 2 };
          if (!this._insideAny(this.blockers, c.x, c.y, Math.max(w, h) / 2)) p = candidate;
        }
        if (!p) {
          const spot = this._findSpot(Math.max(w, h) / 2 + 10, { minFromSpawn: 160 });
          if (spot) p = { x: spot.x - w / 2, y: spot.y - h / 2 };
        }
        if (!p) continue;
        TP().drawField(g, p.x, p.y, w, h, kind);
        this.blockers.push({ x: p.x + w / 2, y: p.y + h / 2, r: Math.max(w, h) / 2 });
        this.solids.push({ x: p.x + w / 2, y: p.y + h / 2, r: Math.max(w, h) / 2 });
      }
    }

    // ================================================================== //
    //  3) DAĞLAR
    // ================================================================== //
    _buildMountainCluster(style) {
      // Dağlar doğuştan uzakta, tercihen kenarlara yakın (yarısı harita dışına taşabilir)
      const center = this._findSpot(140, { minFromSpawn: 400, margin: 40 });
      if (!center) return;
      this.blockers.push({ x: center.x, y: center.y, r: 150 });

      const peaks = [];
      const count = Phaser.Math.Between(2, 4);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = i === 0 ? 0 : Phaser.Math.Between(60, 110);
        peaks.push({
          x: center.x + Math.cos(a) * d,
          y: center.y + Math.sin(a) * d,
          r: i === 0 ? Phaser.Math.Between(100, 125) : Phaser.Math.Between(65, 95),
        });
      }
      // Arkadaki (kuzeydeki) zirve önce çizilir
      peaks.sort((p, q) => p.y - q.y).forEach((p) => {
        const g = this._track(this.scene.add.graphics().setDepth(p.y + p.r * 0.4));
        TP().drawMountain(g, p.x, p.y, p.r, style);
        this._addCircleBlocker(p.x, p.y, p.r * 0.8);
        this.blockers.push({ x: p.x, y: p.y, r: p.r + 40 });
        this.solids.push({ x: p.x, y: p.y, r: p.r + 6 });
      });
    }

    // ================================================================== //
    //  4) GÖLLER
    // ================================================================== //
    _buildLake(style, location) {
      const oasis = style === 'oasis';
      const R = oasis ? Phaser.Math.Between(55, 70) : Phaser.Math.Between(80, 120);
      const center = this._findSpot(R + 70, { minFromSpawn: 280, margin: R + 40 });
      if (!center) return;

      // Göl = iç içe geçmiş daireler → doğal kıyı çizgisi
      const circles = [{ x: center.x, y: center.y, r: R }];
      const extra = Phaser.Math.Between(2, 4);
      for (let i = 0; i < extra; i++) {
        const a = Math.random() * Math.PI * 2;
        circles.push({
          x: center.x + Math.cos(a) * R * Phaser.Math.FloatBetween(0.5, 0.8),
          y: center.y + Math.sin(a) * R * Phaser.Math.FloatBetween(0.4, 0.7),
          r: R * Phaser.Math.FloatBetween(0.5, 0.75),
        });
      }

      const g = this._track(this.scene.add.graphics().setDepth(-6));
      const shines = TP().drawLake(this.scene, g, circles, style);
      shines.forEach((s) => this._track(s));
      this.shines.push(...shines);

      circles.forEach((c) => {
        this._addCircleBlocker(c.x, c.y, c.r - 6);
        this.blockers.push({ x: c.x, y: c.y, r: c.r + 45 });
        this.solids.push({ x: c.x, y: c.y, r: c.r + 16 });
        if (style !== 'frozen') this.water.push({ x: c.x, y: c.y, r: c.r });
      });

      // Vaha: çevresinde hurmalar · Normal göl: kıyıda sazlar
      const ringCount = oasis ? 5 : 7;
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2 + Math.random() * 0.4;
        const d = R + (oasis ? 34 : 16);
        const x = center.x + Math.cos(a) * d;
        const y = center.y + Math.sin(a) * d;
        if (oasis) {
          const palm = this._track(this.scene.add.image(x, y, 'tree_palm').setDepth(y).setScale(0.85));
          this._addObstacle(palm, 0.2);
        } else if (style === 'water') {
          this._track(this.scene.add.image(x, y, 'decor_reed').setDepth(-2));
        }
      }
    }

    // ================================================================== //
    //  5) KUM TEPELERİ ve 6) KAYALAR
    // ================================================================== //
    _buildDunes(count, baseColor) {
      if (!count) return;
      const g = this._track(this.scene.add.graphics().setDepth(-12));
      for (let i = 0; i < count; i++) {
        const p = this._findSpot(60, { margin: 0, useSolids: true });
        if (p) TP().drawDune(g, p.x, p.y, Phaser.Math.Between(140, 240), baseColor);
      }
    }

    _buildBoulder() {
      const p = this._reserve(34, { minFromSpawn: 150 }, true);
      if (!p) return;
      const img = this._track(this.scene.add.image(p.x, p.y, 'boulder').setDepth(p.y).setScale(Phaser.Math.FloatBetween(0.85, 1.25)));
      img.setFlipX(Math.random() < 0.5);
      this._addObstacle(img, 0.36);
      this.solids.push({ x: p.x, y: p.y, r: 20 });
    }

    // ================================================================== //
    //  8) SÜS NESNELERİ
    // ================================================================== //
    _buildDecor(climate) {
      for (let i = 0; i < this.cfg.decorCount; i++) {
        const x = Phaser.Math.Between(0, this.cfg.width);
        const y = Phaser.Math.Between(0, this.cfg.height);
        if (this._insideAny(this.solids, x, y, 0)) continue; // suyun/dağın üstüne çiçek olmaz
        const kind = Phaser.Utils.Array.GetRandom(climate.decor);
        this._track(this.scene.add.image(x, y, `decor_${kind}`).setDepth(-1).setAlpha(0.92));
      }
    }

    // ================================================================== //
    //  Yardımcılar: yerleşim
    // ================================================================== //

    /**
     * Engellerle çakışmayan rastgele bir nokta bulur.
     * @param {number} r Yerleştirilecek şeyin yarıçapı
     * @param {{minFromSpawn?:number, maxFromSpawn?:number, margin?:number, useSolids?:boolean}} opts
     */
    _findSpot(r, { minFromSpawn = 0, maxFromSpawn = Infinity, margin = 60, useSolids = false } = {}) {
      const list = useSolids ? this.solids : this.blockers;
      for (let i = 0; i < 300; i++) {
        let p;
        if (maxFromSpawn < Infinity) {
          // Doğuş noktası etrafında bir halkadan seç
          const a = Math.random() * Math.PI * 2;
          const d = Phaser.Math.Between(minFromSpawn, maxFromSpawn);
          p = { x: this.spawn.x + Math.cos(a) * d, y: this.spawn.y + Math.sin(a) * d };
        } else {
          p = {
            x: Phaser.Math.Between(margin, this.cfg.width - margin),
            y: Phaser.Math.Between(margin, this.cfg.height - margin),
          };
        }
        if (p.x < margin || p.y < margin || p.x > this.cfg.width - margin || p.y > this.cfg.height - margin) continue;
        if (Math.hypot(p.x - this.spawn.x, p.y - this.spawn.y) < minFromSpawn) continue;
        if (this._insideAny(list, p.x, p.y, r)) continue;
        return p;
      }
      return null;
    }

    /**
     * _findSpot + bulunan noktayı engel listesine ekler.
     * İpucu nesneleri için mutlaka bir yer bulunur: halka dolu ise kısıt gevşetilir.
     */
    _reserve(r, opts, optional = false) {
      let p = null;
      if (opts.reachable && this.walk) {
        // Yürüyerek ulaşılabilen bir nokta ara (40 deneme)
        for (let i = 0; i < 40 && !p; i++) {
          const q = this._findSpot(r, { margin: 70, ...opts });
          if (!q) break;
          if (this._isReachable(q.x, q.y + 10)) p = q;
        }
        if (p) {
          this.blockers.push({ x: p.x, y: p.y, r });
          return p;
        }
        if (optional) return null; // sandık: ulaşılabilir yer yoksa hiç konmaz
      }
      p = this._findSpot(r, { margin: 70, ...opts });
      if (!p && !optional) p = this._findSpot(r, { margin: 70, minFromSpawn: opts.minFromSpawn });
      if (!p && !optional) p = this._findSpot(r, { margin: 70, useSolids: true });
      if (!p) return null;
      this.blockers.push({ x: p.x, y: p.y, r });
      return p;
    }

    /**
     * Yürünebilir alan haritası (16 px ızgara): statik engellerden (göl, dağ,
     * kanyon, ağaç gövdesi…) oyuncunun gövdesi kadar pay bırakılır, sonra
     * doğuş noktasından taşma dolgusu (flood fill) ile ulaşılabilen hücreler bulunur.
     */
    _buildWalkMap() {
      const C = 16;
      const W = this.cfg.width;
      const H = this.cfg.height;
      const cols = Math.ceil(W / C);
      const rows = Math.ceil(H / C);
      const blocked = new Uint8Array(cols * rows);
      const pad = 9;
      this.obstacles.getChildren().forEach((o) => {
        const bd = o.body;
        if (!bd || !bd.enable) return;
        if (bd.isCircle) {
          const cx = bd.center.x;
          const cy = bd.center.y;
          const r = bd.halfWidth + pad;
          for (let gy = Math.max(0, Math.floor((cy - r) / C)); gy <= Math.min(rows - 1, Math.floor((cy + r) / C)); gy++) {
            for (let gx = Math.max(0, Math.floor((cx - r) / C)); gx <= Math.min(cols - 1, Math.floor((cx + r) / C)); gx++) {
              const px = gx * C + C / 2;
              const py = gy * C + C / 2;
              if ((px - cx) ** 2 + (py - cy) ** 2 <= r * r) blocked[gy * cols + gx] = 1;
            }
          }
          return;
        }
        for (let gy = Math.max(0, Math.floor((bd.y - 4) / C)); gy <= Math.min(rows - 1, Math.floor((bd.bottom + 4) / C)); gy++) {
          for (let gx = Math.max(0, Math.floor((bd.x - pad) / C)); gx <= Math.min(cols - 1, Math.floor((bd.right + pad) / C)); gx++) {
            blocked[gy * cols + gx] = 1;
          }
        }
      });
      const seen = new Uint8Array(cols * rows);
      const start = Math.floor(this.spawn.y / C) * cols + Math.floor(this.spawn.x / C);
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const c = stack.pop();
        const cx = c % cols;
        const cy = (c / cols) | 0;
        if (cx > 1) visit(c - 1);
        if (cx < cols - 2) visit(c + 1);
        if (cy > 1) visit(c - cols);
        if (cy < rows - 2) visit(c + cols);
      }
      function visit(n) {
        if (!seen[n] && !blocked[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
      this.walk = { C, cols, rows, seen };
    }

    /** Bu noktanın etkileşim menzilinde yürüyerek ulaşılabilen bir hücre var mı? */
    _isReachable(x, y) {
      const { C, cols, rows, seen } = this.walk;
      const range = GS.CONFIG.PLAYER.interactRange * 0.8;
      for (let gy = Math.max(0, Math.floor((y - range) / C)); gy <= Math.min(rows - 1, Math.floor((y + range) / C)); gy++) {
        for (let gx = Math.max(0, Math.floor((x - range) / C)); gx <= Math.min(cols - 1, Math.floor((x + range) / C)); gx++) {
          if (seen[gy * cols + gx] && Math.hypot(gx * C + C / 2 - x, gy * C + C / 2 - y) <= range) return true;
        }
      }
      return false;
    }

    _insideAny(list, x, y, r) {
      return list.some((b) => Math.hypot(x - b.x, y - b.y) < r + b.r);
    }

    _track(obj) {
      this.created.push(obj);
      return obj;
    }

    // ================================================================== //
    //  Yardımcılar: çarpışma
    // ================================================================== //

    /** Görünmez, daire biçimli statik engel (göl, nehir, dağ için) */
    _addCircleBlocker(x, y, r) {
      const zone = this._track(this.scene.add.zone(x, y, r * 2, r * 2));
      this.obstacles.add(zone);
      zone.body.setCircle(r);
    }

    /** Görünen bir nesneye (ağaç, kaya) gövde: dokunun alt kısmında küçük daire */
    _addObstacle(obj, radiusRatio) {
      this.obstacles.add(obj);
      const r = Math.max(6, obj.displayWidth * radiusRatio);
      // Not: StaticBody'de setCircle'ın ofset parametresi uygulanmaz, setOffset ayrıca çağrılmalı.
      obj.body.setCircle(r);
      obj.body.setOffset(obj.displayWidth / 2 - r, obj.displayHeight * 0.78 - r);
    }

    /**
     * Güneş çubuğunun ekinoks öğlenindeki gölgesi.
     * Kuzey Yarım Küre → gölge KUZEYE (ekranda yukarı), Güney → GÜNEYE (aşağı).
     * Uzunluk = çubuk boyu × 1/tan(90° − enlem)
     */
    _drawStickShadow(stick, location) {
      const ratio = GS.ClueFactory.shadowRatio(location.latitude);
      const stickPx = 30; // Ekranda "1 metre"
      const length = Math.min(90, stickPx * ratio);
      const dirY = location.hemisphere === 'KUZEY' ? -1 : 1;
      const baseX = stick.x;
      const baseY = stick.y + stick.displayHeight / 2 - 4;

      const g = this.scene.add.graphics().setDepth(2);
      g.lineStyle(6, 0x000000, 0.35);
      g.beginPath();
      g.moveTo(baseX, baseY);
      g.lineTo(baseX + 2, baseY + dirY * length);
      g.strokePath();
      return g;
    }
  }

  GS.WorldBuilder = WorldBuilder;
})(window.GS = window.GS || {});
