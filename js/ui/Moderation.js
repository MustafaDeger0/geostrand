/**
 * ============================================================================
 *  GeoStrand — Oyuncu Gizleme ve Şikâyet (Moderation)
 * ============================================================================
 *  Çevrim içi yarışta başka bir oyuncunun adına (sıralama tablosunda ya da
 *  lobide) dokununca küçük bir menü açılır:
 *    🙈 Gizle       — o oyuncunun adı "Gizli kâşif" olur, kâşifi haritada görünmez
 *                     (yalnız senin ekranında; bu oturum boyunca hatırlanır)
 *    ⚠️ Şikâyet et  — sunucuya bildirilir; odadan iki kişi şikâyet ederse
 *                     sunucu o oyuncunun adını "Kâşif 37" gibi bir adla değiştirir
 *  Sunucu ayrıca uygunsuz adları baştan süzer (server/nameFilter.js).
 *  Bu, App Store (kural 1.2) ve Google Play'in kullanıcı içeriği şartıdır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const KEY = 'geostrand-hidden';

  class Moderation {
    constructor(doc) {
      this.doc = doc;
      this.listeners = new Set();
      try {
        this.hidden = new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]'));
      } catch (e) {
        this.hidden = new Set();
      }
      this.pop = doc.createElement('div');
      this.pop.className = 'mod-pop hidden';
      this.pop.setAttribute('role', 'menu');
      doc.body.appendChild(this.pop);
      doc.addEventListener('pointerdown', (e) => {
        if (!this.pop.classList.contains('hidden') && !this.pop.contains(e.target)) this.closeMenu();
      }, true);
    }

    isHidden(id) {
      return this.hidden.has(id);
    }

    /** Görünecek ad (gizlenmişse "Gizli kâşif") */
    name(p) {
      return this.isHidden(p.id) ? 'Gizli kâşif' : p.name;
    }

    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    /** Bir oyuncu satırına dokunulunca menüyü aç (kendin için açılmaz) */
    openMenu(anchor, player) {
      if (!player || !GS.net || player.id === GS.net.playerId) return;
      const hidden = this.isHidden(player.id);
      this.pop.textContent = '';
      const title = this.doc.createElement('b');
      title.textContent = this.name(player);
      const hide = this._button(hidden ? '👁️ Göster' : '🙈 Gizle', () => this.toggleHidden(player.id));
      const report = this._button('⚠️ Uygunsuz ad: şikâyet et', () => this.report(player));
      this.pop.append(title, hide, report);
      this.pop.classList.remove('hidden');
      const r = anchor.getBoundingClientRect();
      const w = 230;
      const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
      const top = r.bottom + 6 + 120 > window.innerHeight ? r.top - 126 : r.bottom + 6;
      this.pop.style.left = `${left}px`;
      this.pop.style.top = `${Math.max(8, top)}px`;
    }

    closeMenu() {
      this.pop.classList.add('hidden');
    }

    toggleHidden(id) {
      if (this.hidden.has(id)) this.hidden.delete(id);
      else this.hidden.add(id);
      try {
        sessionStorage.setItem(KEY, JSON.stringify([...this.hidden]));
      } catch (e) { /* depolama kapalı */ }
      this.closeMenu();
      this.listeners.forEach((fn) => fn());
    }

    async report(player) {
      this.closeMenu();
      const res = await GS.net.call('player:report', { id: player.id });
      const msg = res.error ? res.error : res.renamed ? 'Teşekkürler. Bu oyuncunun adı değiştirildi.' : 'Teşekkürler, şikâyetin iletildi.';
      const scene = GS.game && GS.game.scene.getScene('RaceScene');
      if (scene && scene.sys.isActive() && scene.hud) scene.hud.toast(msg, res.error ? 'danger' : 'success');
      else if (GS.lobby) GS.lobby.toast(msg);
    }

    _button(text, fn) {
      const b = this.doc.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      return b;
    }
  }

  GS.Moderation = Moderation;
})(window.GS = window.GS || {});
