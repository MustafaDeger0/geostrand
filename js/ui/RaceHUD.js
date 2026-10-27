/**
 * ============================================================================
 *  GeoStrand — Yarış Arayüzü (RaceHUD)
 * ============================================================================
 *  Çevrim içi yarışta ekranda olanlar (HTML/DOM):
 *    • Sol üst  : oda (ya da 🌍 hızlı eşleşme), tur (2/5), kalan süre (son 20 sn kırmızı)
 *    • Sağ      : canlı sıralama — her oyuncunun puanı ve durumu
 *                 (🔍 2/4 ipucu buldu · 🥇 bildi · ✘ yanlış sayısı)
 *    • Orta     : tur başında 3-2-1 geri sayım
 *    • Tur sonu : gerçek konum açıklanır + bu turun sıralaması + genel durum
 *    • Oyun sonu: kürsü (ilk üç) ve tüm sıralama
 *  Oyuncu adları her zaman METİN olarak yazılır (HTML olarak değil): güvenlik.
 * ============================================================================
 */
(function (GS) {
  'use strict';

  const MEDALS = ['🥇', '🥈', '🥉'];
  const FIELD_NAMES = { hemisphere: 'Yarım küre', climate: 'İklim', latitude: 'Enlem', landform: 'Yer şekli', continent: 'Kıta' };

  class RaceHUD {
    constructor(doc, net) {
      this.doc = doc;
      this.net = net;
      const $ = (id) => doc.getElementById(id);
      this.el = {
        root: $('race-hud'),
        code: $('race-code'),
        round: $('race-round'),
        timer: $('race-timer'),
        board: $('race-board'),
        boardPanel: $('race-board-panel'),
        countdown: $('race-countdown'),
        countNum: $('race-countdown-num'),
        countSub: $('race-countdown-sub'),
        roundEnd: $('race-round-end'),
        roundEndCard: $('race-round-end-card'),
        final: $('race-final'),
        finalCard: $('race-final-card'),
      };
      this.el.root.classList.remove('hidden');
      this.el.code.textContent = net.isPublic ? '🌍 Hızlı eşleşme' : `Oda ${net.code || '----'}`;
      this._last = {};
      // Telefonda sıralama paneline dokununca açılır/kapanır
      this._toggleBoard = () => this.el.boardPanel.classList.toggle('expanded');
      this.el.boardPanel.addEventListener('click', this._toggleBoard);
    }

    showWaiting() {
      this._text('round', 'Tur bekleniyor…');
    }

    /** Yeni tur: geri sayım perdesi */
    startRound(r, timing) {
      const tier = GS.CONFIG.PROGRESSION.tiers[r.tierIndex];
      this.clueTotal = tier.clues.length;
      this._text('round', `Tur ${r.index}/${r.total}`);
      this.el.countSub.textContent = `Tur ${r.index} · ${tier.fields.map((f) => FIELD_NAMES[f]).join(' · ')}`;
      clearTimeout(this._hideCount);
      this._hiding = false;
      this.el.countdown.classList.toggle('hidden', !(timing.countdownLeft > 0));
      this.renderBoard(this.net.state);
    }

    /** Her kare: kalan süre ve geri sayım */
    tick(timing) {
      if (!timing) return;
      if (timing.countdownLeft > 0) {
        this._text('countNum', String(Math.ceil(timing.countdownLeft / 1000)));
      } else if (!this.el.countdown.classList.contains('hidden') && !this._hiding) {
        // "Başla!" bir kez görünür, 0,7 sn sonra kalkar
        this._text('countNum', 'Başla!');
        this._hiding = true;
        this._hideCount = setTimeout(() => {
          this.el.countdown.classList.add('hidden');
          this._hiding = false;
        }, 700);
      }
      const s = Math.ceil(timing.playLeft / 1000);
      this._text('timer', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      const low = s <= 20 && timing.countdownLeft === 0;
      if (this._last.low !== low) {
        this.el.timer.classList.toggle('low', low);
        this._last.low = low;
      }
    }

    /** Canlı sıralama */
    renderBoard(state) {
      if (!state) return;
      const total = this.clueTotal || 3;
      const inRound = state.phase === 'playing';
      const ul = this.el.board;
      ul.textContent = '';
      [...state.players]
        .sort((a, b) => b.score - a.score || (a.rank ?? 99) - (b.rank ?? 99) || a.name.localeCompare(b.name, 'tr'))
        .forEach((p, i) => {
          const li = this.doc.createElement('li');
          if (p.id === this.net.playerId) li.classList.add('me');
          if (!p.connected) li.classList.add('off');
          const status = inRound
            ? (p.solved ? (MEDALS[p.rank - 1] || '✔') : `🔍 ${p.found}/${total}${p.wrongs ? ` ✘${p.wrongs}` : ''}`)
            : '';
          li.append(span('pos', String(i + 1)), span('nm', p.name), span(`st${p.solved && inRound ? ' ok' : ''}`, status), el('b', String(p.score)));
          ul.appendChild(li);
        });
      this.el.boardPanel.dataset.count = String(state.players.length);
    }

    // ------------------------------------------------------------------ //
    //  Tur sonu
    // ------------------------------------------------------------------ //
    showRoundEnd(e, selfId) {
      this.el.countdown.classList.add('hidden');
      const rv = e.reveal;
      const card = this.el.roundEndCard;
      card.textContent = '';
      const why = { 'all-solved': 'Herkes bildi!', time: 'Süre doldu.', empty: '' }[e.reason] || '';
      card.append(el('p', `Tur ${e.index}/${e.total} bitti · ${why}`, 'race-kicker'), el('h2', rv.name));
      const badges = el('div', '', 'badges');
      [`📍 ${rv.latitude}° ${rv.hemisphereLabel}`, `${rv.climateIcon} ${rv.climate}`,
        `${rv.landform} · ${rv.elevation.toLocaleString('tr-TR')} m`, rv.continent]
        .forEach((t) => badges.appendChild(el('span', t, 'badge ok')));
      card.appendChild(badges);
      const table = el('table', '', 'race-table');
      const tbody = el('tbody');
      e.results.forEach((r) => {
        const tr = el('tr', '', r.id === selfId ? 'me' : '');
        tr.append(
          el('td', r.solved ? MEDALS[r.rank - 1] || `${r.rank}.` : '—'),
          el('td', r.name),
          el('td', r.solved ? formatTime(r.timeMs) : 'bilemedi'),
          el('td', r.wrongs ? `✘${r.wrongs}` : ''),
          el('td', r.points ? `+${r.points}` : '0', 'pts'),
        );
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      card.appendChild(table);
      const next = el('p', e.last ? 'Son tur bitti, sonuçlar geliyor…' : '', 'race-next');
      card.appendChild(next);
      this.el.roundEnd.classList.remove('hidden');
      clearInterval(this._nextTimer);
      if (!e.last) {
        const until = performance.now() + e.nextInMs;
        const tick = () => {
          const left = Math.max(0, Math.ceil((until - performance.now()) / 1000));
          next.textContent = `Sonraki tur ${left} sn sonra`;
          if (left <= 0) clearInterval(this._nextTimer);
        };
        tick();
        this._nextTimer = setInterval(tick, 250);
      }
    }

    // ------------------------------------------------------------------ //
    //  Oyun sonu: kürsü
    // ------------------------------------------------------------------ //
    showFinal(standings, selfId, isHost, isPublic) {
      this.el.roundEnd.classList.add('hidden');
      clearInterval(this._nextTimer);
      const card = this.el.finalCard;
      card.textContent = '';
      const myPlace = standings.findIndex((p) => p.id === selfId) + 1;
      card.append(el('p', 'Yarış bitti', 'race-kicker'), el('h2', myPlace === 1 ? 'Kazandın! 🎉' : `${myPlace}. oldun`));

      const podium = el('div', '', 'podium');
      [1, 0, 2].forEach((i, slot) => {
        const p = standings[i];
        const place = [2, 1, 3][slot];
        const box = el('div', '', p ? `podium-slot p${place}` : 'podium-slot empty');
        if (p) {
          const c = this.doc.createElement('canvas');
          c.width = c.height = 64;
          GS.CharacterRenderer.drawPortrait(c, GS.CharacterRenderer.normalize(p.appearance));
          box.append(c, el('b', p.name), el('span', `${p.score} puan`), el('div', MEDALS[place - 1], 'podium-step'));
        }
        podium.appendChild(box);
      });
      card.appendChild(podium);

      const list = el('ol', '', 'race-final-list');
      standings.forEach((p, i) => {
        const li = el('li', '', p.id === selfId ? 'me' : '');
        li.append(span('pos', String(i + 1)), span('nm', p.name), el('b', String(p.score)));
        list.appendChild(li);
      });
      card.appendChild(list);

      const actions = el('div', '', 'race-actions');
      const button = (text, cls, fn) => {
        const b = el('button', text, cls);
        b.type = 'button';
        b.addEventListener('click', fn);
        actions.appendChild(b);
        return b;
      };
      if (isPublic) {
        button('🔎 Yeni rakip ara', 'btn-signal', () => GS.returnToMainMenu({ quickMatch: true }));
      } else if (isHost) {
        button('Yeniden yarış', 'btn-signal', async (ev) => {
          ev.currentTarget.disabled = true;
          const res = await this.net.start();
          if (res.error) GS.lobby.toast(res.error);
        });
      } else {
        actions.appendChild(el('p', 'Kurucu yeni yarışı başlatabilir.', 'race-wait'));
      }
      if (!isPublic) {
        button('Lobi ve ayarlar', 'btn-ghost', () => {
          this.el.final.classList.add('hidden');
          GS.lobby.showRoom();
        });
      }
      button('🏠 Ana menü', 'btn-ghost', () => GS.returnToMainMenu());
      card.appendChild(actions);
      this.el.final.classList.remove('hidden');
    }

    hideOverlays() {
      clearInterval(this._nextTimer);
      this.el.roundEnd.classList.add('hidden');
      this.el.final.classList.add('hidden');
    }

    destroy() {
      this.hideOverlays();
      clearTimeout(this._hideCount);
      this.el.boardPanel.removeEventListener('click', this._toggleBoard);
      this.el.root.classList.add('hidden');
      this.el.countdown.classList.add('hidden');
    }

    _text(key, value) {
      if (this._last[key] === value) return;
      this.el[key].textContent = value;
      this._last[key] = value;
    }
  }

  /** Güvenli DOM yardımcıları: metin her zaman textContent ile yazılır */
  function el(tag, text = '', cls = '') {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function span(cls, text) {
    return el('span', text, cls);
  }

  function formatTime(ms) {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  GS.RaceHUD = RaceHUD;
  GS.escapeHtml = (str) => String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
})(window.GS = window.GS || {});
