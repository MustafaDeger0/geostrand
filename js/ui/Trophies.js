/**
 * ============================================================================
 *  GeoStrand — Rozet Arayüzü (Trophies): bildirim + vitrin
 * ============================================================================
 *  • Bildirim: rozet kazanılınca ekranın üstünden bir madalya kartı kayar
 *    (kademe rengi: bronz / gümüş / altın), kısa bir ses çalar. Aynı anda
 *    birden çok rozet gelirse sırayla gösterilir.
 *  • Vitrin: ana menüden ve duraklatma menüsünden açılan pencere.
 *    Kategoriler hâlinde tüm rozetler; kazanılanlar renkli, kazanılmayanlar
 *    soluk. Her rozette kademe noktaları ve sonraki hedefe ilerleme çubuğu.
 *    Gizli rozetler kazanılana kadar yalnızca ipucu gösterir.
 *
 *  Bu modül sahneden bağımsızdır (GS.trophies tek örnek, main.js kurar).
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const TIER_CLASS = ['bronze', 'silver', 'gold'];

  class Trophies {
    /**
     * @param {Document} doc
     * @param {GS.Achievements} store
     */
    constructor(doc, store) {
      this.doc = doc;
      this.store = store;
      this.queue = [];
      this.busy = false;
      this.isOpen = false;
      this.onClose = null;

      // Bildirim kutusu
      this.toastEl = doc.createElement('div');
      this.toastEl.id = 'trophy-toast';
      this.toastEl.className = 'hidden';
      this.toastEl.setAttribute('role', 'status');
      this.toastEl.setAttribute('aria-live', 'polite');
      doc.body.appendChild(this.toastEl);

      // Vitrin penceresi
      this.root = doc.createElement('div');
      this.root.id = 'trophies';
      this.root.className = 'overlay hidden';
      this.root.setAttribute('role', 'dialog');
      this.root.setAttribute('aria-modal', 'true');
      this.root.setAttribute('aria-labelledby', 'trophies-title');
      this.root.innerHTML = `
        <div class="trophies">
          <header class="guide-header">
            <h2 id="trophies-title">🏅 Rozetler</h2>
            <button type="button" class="pad-close" id="trophies-close" aria-label="Kapat (Esc)">✕</button>
          </header>
          <div class="tr-summary" id="trophies-summary"></div>
          <div class="tr-body" id="trophies-body"></div>
        </div>`;
      doc.body.appendChild(this.root);
      this.body = this.root.querySelector('#trophies-body');
      this.summaryEl = this.root.querySelector('#trophies-summary');
      this.root.querySelector('#trophies-close').addEventListener('click', () => this.close());
      this.root.addEventListener('click', (e) => {
        if (e.target === this.root) this.close();
      });
      doc.addEventListener('keydown', (e) => {
        if (this.isOpen && e.key === 'Escape') {
          e.stopPropagation();
          this.close();
        }
      }, true);
    }

    // ------------------------------------------------------------------ //
    //  Bildirim
    // ------------------------------------------------------------------ //

    /** @param {Array<{def, tier, tierName}>} unlocked Achievements olaylarının dönüşü */
    report(unlocked) {
      if (!unlocked || !unlocked.length) return;
      this.queue.push(...unlocked);
      this._next();
    }

    _next() {
      if (this.busy || !this.queue.length) return;
      this.busy = true;
      const u = this.queue.shift();
      const tierCls = u.def.goals.length > 1 ? TIER_CLASS[u.tier - 1] : 'gold';
      const goal = u.def.goals[u.tier - 1];
      const detail = u.def.goals.length > 1 ? `${u.def.desc}: ${goal.toLocaleString('tr-TR')}` : u.def.desc;
      this.toastEl.className = `tier-${tierCls}`;
      this.toastEl.innerHTML = `
        <span class="tt-medal"><span>${u.def.icon}</span></span>
        <span class="tt-text">
          <small>Rozet kazandın${u.tierName ? ` · ${u.tierName}` : ''}</small>
          <b>${esc(u.def.name)}</b>
          <span>${esc(detail)}</span>
        </span>`;
      if (GS.audio) GS.audio.sfx('loot');
      clearTimeout(this._t1);
      clearTimeout(this._t2);
      this._t1 = setTimeout(() => this.toastEl.classList.add('leave'), 3400);
      this._t2 = setTimeout(() => {
        this.toastEl.className = 'hidden';
        this.busy = false;
        this._next();
      }, 3900);
    }

    // ------------------------------------------------------------------ //
    //  Vitrin
    // ------------------------------------------------------------------ //

    /** @param {Function} [onClose] kapanınca (ör. menüye dön) */
    open(onClose) {
      this.onClose = onClose || null;
      this._render();
      this.root.classList.remove('hidden');
      this.isOpen = true;
      this.root.querySelector('#trophies-close').focus();
    }

    close() {
      if (!this.isOpen) return;
      this.root.classList.add('hidden');
      this.isOpen = false;
      const cb = this.onClose;
      this.onClose = null;
      if (cb) cb();
    }

    _render() {
      const A = GS.Achievements;
      const sum = this.store.summary();
      const pct = Math.round((sum.got / sum.total) * 100);
      this.summaryEl.innerHTML = `
        <div class="tr-sum-text"><b>${sum.badges}</b>/${sum.badgeTotal} rozet · <b>${sum.got}</b>/${sum.total} kademe</div>
        <div class="tr-bar"><i style="width:${pct}%"></i></div>
        <div class="tr-legend"><span class="tier-bronze">● Bronz</span><span class="tier-silver">● Gümüş</span><span class="tier-gold">● Altın</span></div>`;

      const items = this.store.list();
      this.body.innerHTML = A.CATEGORIES.map((cat) => {
        const list = items.filter((it) => it.def.cat === cat.key);
        const got = list.filter((it) => it.tier > 0).length;
        return `<section class="tr-cat">
          <h3>${cat.icon} ${cat.label} <span>${got}/${list.length}</span></h3>
          <div class="tr-grid">${list.map((it) => this._card(it)).join('')}</div>
        </section>`;
      }).join('');
    }

    _card(it) {
      const { def, tier, maxTier, value, next } = it;
      const unlocked = tier > 0;
      const hidden = def.secret && !unlocked;
      const tierCls = unlocked ? (maxTier > 1 ? TIER_CLASS[tier - 1] : 'gold') : 'locked';
      const pips = maxTier > 1
        ? `<span class="tr-pips">${[0, 1, 2].map((i) => `<i class="${i < tier ? TIER_CLASS[i] : ''}"></i>`).join('')}</span>`
        : '';
      let progress = '';
      if (next !== null && !hidden) {
        const shown = Math.min(value, next);
        progress = `<span class="tr-prog"><i style="width:${Math.round((shown / next) * 100)}%"></i></span>
          <small class="tr-num">${shown.toLocaleString('tr-TR')} / ${next.toLocaleString('tr-TR')}${maxTier > 1 && tier < maxTier ? ` → ${A_TIER(tier)}` : ''}</small>`;
      } else if (next === null) {
        progress = `<small class="tr-num done">✔ ${maxTier > 1 ? 'Altın kademe tamam' : 'Kazanıldı'}${it.unlockedAt ? ` · ${it.unlockedAt.split('-').reverse().join('.')}` : ''}</small>`;
      }
      return `<article class="tr-card ${unlocked ? 'on' : 'off'} tier-${tierCls}${hidden ? ' secret' : ''}">
        <span class="tr-medal"><span>${hidden ? '❔' : def.icon}</span></span>
        <div class="tr-info">
          <b>${hidden ? 'Gizli rozet' : esc(def.name)}</b>${pips}
          <p>${esc(hidden ? def.hint : def.desc)}</p>
          ${progress}
        </div>
      </article>`;
    }
  }

  /** Sonraki kademe adı */
  function A_TIER(tier) {
    return GS.Achievements.TIER_NAMES[tier];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  GS.Trophies = Trophies;
})(window.GS = window.GS || {});
