/**
 * ============================================================================
 *  GeoStrand — Dokunmatik Kontroller (TouchControls)
 * ============================================================================
 *  Telefon ve tablette klavye olmadan oynamak için iki yol:
 *
 *  1) KAYDIR (sanal joystick)
 *     Ekranın herhangi bir yerine parmağını koy ve kaydır: parmağın altında
 *     bir joystick belirir, kâşif o yöne yürür. Ne kadar uzağa kaydırırsan
 *     o kadar hızlı yürür. Parmak halkadan çok uzaklaşırsa halka da peşinden
 *     gelir (yön değiştirmek için parmağı kaldırmak gerekmez).
 *
 *  2) DOKUN (dokunduğun yere yürü)
 *     Kısa bir dokunuş, kâşifi o noktaya yürütür. Sarı "?" işaretli bir
 *     nesneye ya da 📦 sandığa dokunursan yanına gider ve kendiliğinden inceler.
 *
 *  FAREYLE (bilgisayar): joystick görünmez. Tıkla → oraya yürü; basılı tutup
 *  sürükle → kâşif fare imlecini takip eder. Klavyeye basınca otomatik
 *  yürüme iptal olur. Dokunmatik kontroller oyun kuralı içermez: yalnızca
 *  bir yön vektörü üretir; Player bu vektörle yürür.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const DRAG_START_PX = 12;    // bu kadar kaydırınca joystick başlar
  const RADIUS = 56;           // joystick halkasının yarıçapı (ekran px)
  const DEAD_ZONE = 0.18;      // çok küçük kaydırmalar yok sayılır
  const ARRIVE_PX = 10;        // hedefe bu kadar yaklaşınca dur
  const OBJECT_TAP_PX = 46;    // nesneye "dokundu" sayılma mesafesi (dünya px)

  class TouchControls {
    /**
     * @param {Phaser.Scene} scene
     * @param {GS.Player} player
     * @param {{range:number, onInteract:Function, getTargets:Function}} opts
     */
    constructor(scene, player, { range, onInteract, getTargets }) {
      this.scene = scene;
      this.player = player;
      this.range = range;
      this.onInteract = onInteract;
      this.getTargets = getTargets;

      this.enabled = true;
      this.pointerId = null;   // joystick'i süren parmak
      this.stick = null;       // {bx, by, x, y} aktif joystick
      this.moveTo = null;      // {x, y, target?} dokunulan nokta
      this.vector = { x: 0, y: 0 };
      this._stuckTime = 0;

      // Joystick görseli: HTML (her ekranda keskin, kamera yakınlaştırmasından etkilenmez)
      this.el = document.getElementById('joystick');
      this.knob = this.el.querySelector('.knob');

      // Dokunulan noktada beliren halka (dünya içinde)
      this.marker = scene.add.circle(0, 0, 14).setStrokeStyle(3, 0xffd23f, 0.95)
        .setDepth(4400).setVisible(false);

      const input = scene.input;
      input.on('pointerdown', this._down, this);
      input.on('pointermove', this._move, this);
      input.on('pointerup', this._up, this);
      input.on('pointerupoutside', this._up, this);
      input.on('gameout', this._cancelStick, this);
    }

    /** Pad / menü açılınca (ya da ölünce) dokunmatik girdi durur */
    setEnabled(enabled) {
      if (this.enabled === enabled) return;
      this.enabled = enabled;
      if (!enabled) {
        this._cancelStick();
        this.cancelMove();
      }
    }

    cancelMove() {
      this.moveTo = null;
      this.marker.setVisible(false);
    }

    // ------------------------------------------------------------------ //
    //  Parmak olayları
    // ------------------------------------------------------------------ //
    _down(pointer) {
      if (!this.enabled || this.pointerId !== null) return;
      this.pointerId = pointer.id;
      this.start = { x: pointer.x, y: pointer.y };
      this.dragging = false;
      this.isMouse = !pointer.wasTouch;
    }

    _move(pointer) {
      if (pointer.id !== this.pointerId || !this.enabled || !pointer.isDown) return;
      const dx = pointer.x - this.start.x;
      const dy = pointer.y - this.start.y;
      if (!this.dragging) {
        if (Math.hypot(dx, dy) < DRAG_START_PX) return;
        this.dragging = true;
        this.cancelMove();
        // Fare: joystick yok, kâşif imleci takip eder (update'te)
        if (this.isMouse) {
          this.follow = pointer;
          return;
        }
        // Parmak: kaydırma başladı → joystick parmağın ilk değdiği yerde belirir
        this.stick = { bx: this.start.x, by: this.start.y };
        this.el.classList.add('on');
      }
      if (this.isMouse) return;
      // Halka parmağı takip eder (yön değiştirmek kolay olsun)
      let bx = this.stick.bx;
      let by = this.stick.by;
      let ox = pointer.x - bx;
      let oy = pointer.y - by;
      const dist = Math.hypot(ox, oy);
      if (dist > RADIUS) {
        bx = pointer.x - (ox / dist) * RADIUS;
        by = pointer.y - (oy / dist) * RADIUS;
        ox = pointer.x - bx;
        oy = pointer.y - by;
      }
      this.stick.bx = bx;
      this.stick.by = by;
      this.stick.ox = ox;
      this.stick.oy = oy;
      this._drawStick();
    }

    _up(pointer) {
      if (pointer.id !== this.pointerId) return;
      const wasDrag = this.dragging;
      this._cancelStick();
      // Kaydırmadan bırakılan her dokunuş "oraya yürü" demektir
      if (!wasDrag && this.enabled) this._tap(pointer);
    }

    _cancelStick() {
      this.pointerId = null;
      this.dragging = false;
      this.stick = null;
      this.follow = null;
      this.el.classList.remove('on');
    }

    /** Kısa dokunuş: dokunulan nesneye ya da noktaya yürü */
    _tap(pointer) {
      const cam = this.scene.cameras.main;
      const p = cam.getWorldPoint(pointer.x, pointer.y);
      const target = this._objectAt(p.x, p.y);
      if (target) {
        this.moveTo = { x: target.x, y: target.y + target.displayHeight * 0.25, target };
      } else {
        this.moveTo = { x: p.x, y: p.y, target: null };
      }
      this._stuckTime = 0;
      this.marker.setPosition(this.moveTo.x, this.moveTo.y).setVisible(true).setScale(1.4).setAlpha(1);
      this.scene.tweens.add({ targets: this.marker, scale: 0.8, duration: 260, ease: 'Back.Out' });
    }

    /** Dokunulan noktaya en yakın (incelenmemiş) nesne */
    _objectAt(x, y) {
      let best = null;
      let bestD = OBJECT_TAP_PX;
      for (const obj of this.getTargets()) {
        if (obj.type === 'crate' && obj.inspected) continue;
        // Nesnenin gövdesine dokunmak da sayılır (ağacın tepesi gibi)
        const cy = Phaser.Math.Clamp(y, obj.y - obj.displayHeight * 0.6, obj.y + obj.displayHeight * 0.3);
        const d = Phaser.Math.Distance.Between(x, y, obj.x, cy);
        if (d < bestD) {
          best = obj;
          bestD = d;
        }
      }
      return best;
    }

    _drawStick() {
      const s = this.stick;
      this.el.style.transform = `translate(${s.bx}px, ${s.by}px)`;
      this.knob.style.transform = `translate(${s.ox}px, ${s.oy}px)`;
    }

    // ------------------------------------------------------------------ //
    //  Her kare: yön vektörü
    // ------------------------------------------------------------------ //
    /**
     * @param {number} dt saniye
     * @returns {{x:number, y:number}} uzunluğu 0–1 arası yön (hız oranı)
     */
    update(dt) {
      this.vector.x = 0;
      this.vector.y = 0;
      if (!this.enabled) return this.vector;

      // 1) Joystick
      if (this.stick && this.stick.ox !== undefined) {
        const mag = Math.min(1, Math.hypot(this.stick.ox, this.stick.oy) / RADIUS);
        if (mag > DEAD_ZONE) {
          const k = ((mag - DEAD_ZONE) / (1 - DEAD_ZONE)) * 0.6 + 0.4; // hafif dokunuşta bile yürüsün
          const len = Math.hypot(this.stick.ox, this.stick.oy);
          this.vector.x = (this.stick.ox / len) * Math.min(1, k);
          this.vector.y = (this.stick.oy / len) * Math.min(1, k);
        }
        return this.vector;
      }

      // 2) Fare basılı + sürükleniyor: imlece doğru yürü (kamera kaysa da imlecin dünyadaki yeri)
      if (this.follow) {
        const p = this.scene.cameras.main.getWorldPoint(this.follow.x, this.follow.y);
        const fx = p.x - this.player.x;
        const fy = p.y - this.player.y;
        const fd = Math.hypot(fx, fy);
        if (fd > ARRIVE_PX * 2) {
          this.vector.x = fx / fd;
          this.vector.y = fy / fd;
        }
        return this.vector;
      }

      // 3) Dokunulan noktaya yürüme
      const m = this.moveTo;
      if (!m) return this.vector;
      const px = this.player.x;
      const py = this.player.y;

      // Hedef nesneye menzil içinde yaklaştıysa: dur ve incele
      if (m.target) {
        const d = Phaser.Math.Distance.Between(px, py, m.x, m.y);
        if (d <= this.range * 0.85) {
          const target = m.target;
          this.cancelMove();
          this.onInteract(target);
          return this.vector;
        }
      }

      const dx = m.x - px;
      const dy = m.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < ARRIVE_PX) {
        this.cancelMove();
        return this.vector;
      }

      // Bir engele (göl, dağ) takıldıysa vazgeç: sonsuza kadar duvara yürümesin
      if (this.player.body.speed < 8) this._stuckTime += dt;
      else this._stuckTime = 0;
      if (this._stuckTime > 0.45) {
        this.cancelMove();
        return this.vector;
      }

      this.vector.x = dx / dist;
      this.vector.y = dy / dist;
      return this.vector;
    }

    destroy() {
      const input = this.scene.input;
      input.off('pointerdown', this._down, this);
      input.off('pointermove', this._move, this);
      input.off('pointerup', this._up, this);
      input.off('pointerupoutside', this._up, this);
      input.off('gameout', this._cancelStick, this);
      this._cancelStick();
    }
  }

  GS.TouchControls = TouchControls;
})(window.GS = window.GS || {});
