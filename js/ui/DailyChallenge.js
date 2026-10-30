/**
 * ============================================================================
 *  GeoStrand — Günlük Meydan Okuma: kayıt, sonuç kartı, sıralama
 * ============================================================================
 *  • Her gün herkese aynı 5 bölge (plan: logic/Daily.js).
 *  • Günün İLK denemesi sıralamaya girer; sonraki denemeler "antrenman"dır.
 *  • Seri (🔥): üst üste kaç gün meydan okumaya katıldın.
 *  • Sonuç kartı: bölge bölge yıldızlar, puan, süre, kaçış rotası haritası,
 *    paylaşılabilir sonuç metni (Wordle tarzı) ve dünya sıralaması.
 *  • Sıralama sunucudadır (server.js → /api/daily). Sunucuya ulaşılamazsa
 *    sonuç yine cihazda kaydedilir, yalnızca tablo gösterilemez.
 *
 *  GS.daily: tek örnek (main.js kurar). GameScene günlük modda bunu çağırır.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const STORE_KEY = 'geostrand-daily';
  const D = () => GS.Daily;

  class DailyChallenge {
    constructor(doc) {
      this.doc = doc;
      this.data = load();
      if (!this.data.pid) {
        this.data.pid = randomId();
        save(this.data);
      }

      this.root = doc.createElement('div');
      this.root.id = 'daily-result';
      this.root.className = 'overlay hidden';
      this.root.setAttribute('role', 'dialog');
      this.root.setAttribute('aria-modal', 'true');
      doc.body.appendChild(this.root);
    }

    // ------------------------------------------------------------------ //
    //  Plan ve durum
    // ------------------------------------------------------------------ //

    get todayKey() {
      return D().dateKey();
    }

    /** Bugünün planı (konum nesneleriyle) */
    planFor(key = this.todayKey) {
      const C = GS.CONFIG;
      return D().plan(key, {
        locations: GS.LOCATIONS,
        tiers: C.PROGRESSION.tiers,
        climateWeather: GS.CLIMATE_WEATHER,
        Progression: GS.Progression,
        WeatherPicker: GS.WeatherPicker,
      }).map((p) => ({ ...p, location: GS.LOCATIONS.find((l) => l.id === p.locationId) }));
    }

    /** Bugün sıralamalı deneme yapıldı mı? */
    get playedToday() {
      return !!this.data.played[this.todayKey];
    }

    get streak() {
      return D().streak(Object.keys(this.data.played), this.todayKey);
    }

    /** Başlık ekranı için kısa durum */
    status() {
      const today = this.data.played[this.todayKey];
      return {
        played: !!today,
        abandoned: !today && !!this.data.started[this.todayKey],
        today,
        streak: this.streak,
        label: D().label(this.todayKey),
      };
    }

    /** Yeni günlük oyun: GameScene bunu GS.dailyRun olarak okur */
    createRun() {
      const key = this.todayKey;
      return { key, plan: this.planFor(key), ranked: !this.data.played[key] && !this.data.started[key] };
    }

    /**
     * Sıralamalı hak YALNIZCA bir kez kullanılır: oyun başlarken "başladı" diye işaretlenir.
     * Yarıda bırakıp ("Baştan başla" / ana menü) yeniden denemek sıralamaya girmez.
     * @returns {boolean} bu oyun sıralamalı mı
     */
    claim(run) {
      if (!run.ranked || run.claimed || this.data.started[run.key] || this.data.played[run.key]) return false;
      run.claimed = true;
      this.data.started[run.key] = true;
      const keys = Object.keys(this.data.started).sort();
      while (keys.length > 60) delete this.data.started[keys.shift()];
      save(this.data);
      return true;
    }

    // ------------------------------------------------------------------ //
    //  Sonuç
    // ------------------------------------------------------------------ //

    /**
     * Günlük oyun bitti (5 bölge tamam ya da kâşif öldü).
     * @param {{run, results:Array<{stars:number, points:number, wrong:number, seconds:number}>, score:number,
     *          timeMs:number, route:Array, wrongs:number}} r
     * @returns {{unlocked:Array}} başarımlar
     */
    finish(r) {
      const key = r.run.key;
      const solved = r.results.length;
      const cleared = solved >= D().REGIONS;
      const entry = { score: r.score, solved, timeMs: Math.round(r.timeMs), wrongs: r.wrongs, stars: r.results.map((x) => x.stars) };
      let unlocked = [];
      if (r.run.ranked && !this.data.played[key]) {
        // ranked: claim() ile bu oyuna verilmiş tek hak
        this.data.played[key] = entry;
        // Eski günleri temizle (son 60 gün yeter)
        const keys = Object.keys(this.data.played).sort();
        while (keys.length > 60) delete this.data.played[keys.shift()];
        save(this.data);
        unlocked = GS.achievements.dailyFinished({ cleared, perfect: cleared && r.wrongs === 0, streak: this.streak });
      }
      this._show({ ...r, key, solved, cleared, entry, ranked: r.run.ranked });
      return { unlocked };
    }

    _show(r) {
      const streak = this.streak;
      const share = D().shareText({ key: r.key, results: r.results, solved: r.solved, score: r.score, timeMs: r.timeMs, streak });
      const cells = [];
      for (let i = 0; i < D().REGIONS; i++) {
        const x = r.results[i];
        const loc = r.run.plan[i] && r.run.plan[i].location;
        const reached = i <= r.solved;
        cells.push(`<li class="${x ? `ok s${x.stars}` : i === r.solved ? 'dead' : 'none'}">
          <span class="dc-n">${i + 1}</span>
          <span class="dc-st">${x ? '⭐'.repeat(x.stars) : i === r.solved ? '💀' : '—'}</span>
          <small>${x && loc ? esc(GS.RouteMap.shortName(loc.name).split(',')[0]) : reached ? 'Burada kaldın' : '?'}</small>
        </li>`);
      }
      const s = Math.round(r.timeMs / 1000);
      const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const title = r.cleared ? (r.wrongs === 0 ? 'Kusursuz gün! 🌟' : 'Günü tamamladın! 🎉') : 'Meydan okuma bitti';
      this.root.innerHTML = `
        <div class="daily-card" tabindex="-1">
          <header class="guide-header">
            <h2>📅 Günlük meydan okuma · ${D().label(r.key)}</h2>
            <span class="dc-tag ${r.ranked ? 'ranked' : 'practice'}">${r.ranked ? 'Sıralamaya girdi' : 'Antrenman'}</span>
          </header>
          <div class="dc-body">
            <div class="dc-top">
              <div>
                <h3 class="dc-title">${title}</h3>
                <ul class="dc-cells">${cells.join('')}</ul>
                <div class="dc-stats">
                  <span><b>${r.score.toLocaleString('tr-TR')}</b><small>puan</small></span>
                  <span><b>${r.solved}/${D().REGIONS}</b><small>bölge</small></span>
                  <span><b>${time}</b><small>süre</small></span>
                  <span><b>${r.wrongs}</b><small>yanlış</small></span>
                  <span class="streak"><b>🔥 ${streak}</b><small>gün seri</small></span>
                </div>
              </div>
              <div class="dc-map">${GS.RouteMap.svg({ route: r.route, labels: false, className: 'compact' })}</div>
            </div>
            <section class="dc-board">
              <h4>🌍 Bugünün sıralaması</h4>
              <div id="dc-board" class="dc-board-list"><p class="dc-wait">Sıralama yükleniyor…</p></div>
            </section>
            ${r.ranked ? '' : '<p class="dc-note">Bugünkü sıralamalı denemeni zaten yaptın; bu oyun antrenman sayıldı. Yarın yeni 5 bölge seni bekliyor!</p>'}
          </div>
          <footer class="dc-actions">
            <button type="button" class="btn-ghost" id="dc-share">📋 Sonucu kopyala</button>
            <button type="button" class="btn-ghost" id="dc-trophies">🏅 Rozetler</button>
            <button type="button" class="btn-signal" id="dc-home">🏠 Ana menü</button>
          </footer>
        </div>`;
      this.root.classList.remove('hidden');
      this.isOpen = true;
      const $ = (id) => this.root.querySelector(`#${id}`);
      $('dc-home').addEventListener('click', () => GS.returnToMainMenu());
      $('dc-trophies').addEventListener('click', () => GS.trophies.open());
      $('dc-share').addEventListener('click', () => this._copy(share, $('dc-share')));
      // Odak kartın kendisine: art arda basılan Enter yanlışlıkla "Ana menü"ye basmasın
      this.root.querySelector('.daily-card').focus();
      this._board(r);
    }

    async _copy(text, btn) {
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        // Eski tarayıcı / izin yok: gizli metin alanından kopyala
        const ta = this.doc.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        this.doc.body.appendChild(ta);
        ta.select();
        try { ok = this.doc.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      if (navigator.share && !ok) {
        navigator.share({ text }).catch(() => {});
        return;
      }
      btn.textContent = ok ? '✔ Kopyalandı' : 'Kopyalanamadı';
      setTimeout(() => { btn.textContent = '📋 Sonucu kopyala'; }, 2000);
    }

    // ------------------------------------------------------------------ //
    //  Sıralama (sunucu)
    // ------------------------------------------------------------------ //

    _apiBase() {
      const url = GS.NetClient && GS.NetClient.serverUrl ? GS.NetClient.serverUrl() : '';
      if (url) return url;
      return /^https?:$/.test(window.location.protocol) && !(GS.Native && GS.Native.isApp) ? '' : (GS.CONFIG.NET.appServerUrl || null);
    }

    async _board(r) {
      const box = this.root.querySelector('#dc-board');
      const base = this._apiBase();
      if (base === null) {
        box.innerHTML = '<p class="dc-wait">Sıralama için oyunu internet adresinden aç.</p>';
        return;
      }
      const slow = setTimeout(() => {
        if (box.querySelector('.dc-wait')) box.innerHTML = '<p class="dc-wait">Sunucu uyanıyor, bu 1 dakika kadar sürebilir…</p>';
      }, 4000);
      try {
        let res;
        if (r.ranked) {
          const name = (GS.creator.current && GS.creator.current.name) || 'Kâşif';
          res = await request(`${base}/api/daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: r.key, pid: this.data.pid, name, ...r.entry }),
          });
        } else {
          res = await request(`${base}/api/daily?date=${encodeURIComponent(r.key)}&pid=${encodeURIComponent(this.data.pid)}`);
        }
        clearTimeout(slow);
        this._renderBoard(box, res);
      } catch (e) {
        clearTimeout(slow);
        box.innerHTML = '<p class="dc-wait">Sıralamaya şu an ulaşılamadı. Sonucun bu cihazda kayıtlı.</p>';
      }
    }

    _renderBoard(box, res) {
      if (!res || !Array.isArray(res.top)) throw new Error('bad');
      if (!res.top.length) {
        box.innerHTML = '<p class="dc-wait">Bugün henüz kimse bitirmedi. İlk sen ol!</p>';
        return;
      }
      const row = (p) => {
        const s = Math.round(p.timeMs / 1000);
        return `<li class="${p.me ? 'me' : ''}"><span class="pos">${['🥇', '🥈', '🥉'][p.rank - 1] || p.rank}</span>
          <span class="nm">${esc(p.name)}${p.me ? ' (sen)' : ''}</span>
          <span class="sv">${p.solved}/5</span><span class="tm">${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</span><b>${p.score.toLocaleString('tr-TR')}</b></li>`;
      };
      let html = `<ol>${res.top.map(row).join('')}</ol>`;
      if (res.me && !res.top.some((p) => p.me)) html += `<ol class="me-row">${row(res.me)}</ol>`;
      html += `<p class="dc-count">${res.count.toLocaleString('tr-TR')} kâşif bugün katıldı</p>`;
      box.innerHTML = html;
    }
  }

  async function request(url, opts = {}) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), 75000) : null;
    try {
      const resp = await fetch(url, { ...opts, signal: ctrl ? ctrl.signal : undefined });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } finally {
      if (t) clearTimeout(t);
    }
  }

  function load() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(STORE_KEY) || 'null');
      if (raw && typeof raw === 'object') return { pid: raw.pid || null, played: raw.played || {}, started: raw.started || {} };
    } catch (e) { /* bozuk kayıt */ }
    return { pid: null, played: {}, started: {} };
  }

  function save(data) {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* depolama kapalı */ }
  }

  function randomId() {
    const a = new Uint8Array(12);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  GS.DailyChallenge = DailyChallenge;
})(window.GS = window.GS || {});
