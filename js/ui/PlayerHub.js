/** Profile, home-screen settings and resident conversations share one focus-managed dialog. */
(function (GS) {
  'use strict';
  class PlayerHub {
    constructor(doc) {
      this.doc = doc;
      this.isOpen = false;
      this.root = doc.createElement('div');
      this.root.id = 'player-hub';
      this.root.className = 'overlay hidden';
      this.root.innerHTML = `
        <section class="player-hub-card" role="dialog" aria-modal="true" aria-labelledby="hub-title">
          <header class="hub-header"><h2 id="hub-title"></h2><button type="button" class="btn-ghost icon" id="hub-close" aria-label="Kapat">✕</button></header>
          <div id="hub-profile" class="hub-section">
            <div class="hub-identity"><canvas id="hub-portrait" width="120" height="160" aria-hidden="true"></canvas><div><h3 id="hub-name"></h3><p>Kâşif profili · bu cihazda saklanır</p></div></div>
            <div class="hub-stats"><p>En iyi puan <strong id="hub-best"></strong></p><p>Rozetler <strong id="hub-badges"></strong></p><p>Günlük seri <strong id="hub-streak"></strong></p></div>
            <button type="button" class="btn-signal" id="hub-edit">🧭 Kâşifi düzenle</button>
            <p class="hub-note">Adını, şapkanı, şapka rengini, saçını ve kıyafetlerini buradan değiştirebilirsin.</p>
          </div>
          <div id="hub-settings" class="hub-section">
            <p>Ses ayarların bu cihazda hatırlanır.</p>
            <label class="hub-mute"><input type="checkbox" id="hub-mute"> Tüm sesleri kapat</label>
            <div id="hub-volumes"></div>
            <button type="button" class="btn-ghost" id="hub-full">⛶ Tam ekranı aç / kapat</button>
          </div>
          <div id="hub-dialogue" class="hub-section">
            <div class="hub-identity"><canvas id="hub-resident" width="96" height="128" aria-hidden="true"></canvas><h3 id="hub-resident-name"></h3></div>
            <p id="hub-speech"></p><p class="hub-tip" id="hub-tip"></p>
            <p class="hub-note">Bölge sakinlerinin gözlemlerini, topladığın ipuçlarıyla birlikte değerlendir.</p>
            <button type="button" class="btn-signal" id="hub-goodbye">Görüşürüz</button>
          </div>
        </section>`;
      doc.body.appendChild(this.root);
      const $ = (id) => doc.getElementById(id);
      this.$ = $;
      $('hub-close').addEventListener('click', () => this.close());
      $('hub-goodbye').addEventListener('click', () => this.close());
      $('hub-full').addEventListener('click', () => GS.toggleFullscreen());
      this.root.addEventListener('click', (event) => { if (event.target === this.root) this.close(); });
      const labels = { master: 'Ana ses', music: 'Müzik', ambience: 'Doğa sesleri', sfx: 'Efektler' };
      Object.entries(labels).forEach(([channel, label]) => {
        const row = doc.createElement('label');
        row.className = 'hub-slider';
        row.innerHTML = `<span>${label}</span><input type="range" min="0" max="100" data-channel="${channel}" aria-label="${label}"><output></output>`;
        const input = row.querySelector('input');
        input.addEventListener('input', () => {
          GS.audio.init();
          GS.audio.setVolume(channel, Number(input.value) / 100);
          row.querySelector('output').textContent = input.value + '%';
          $('hub-mute').checked = GS.audio.muted;
        });
        $('hub-volumes').appendChild(row);
      });
      $('hub-mute').addEventListener('change', () => {
        GS.audio.init();
        if ($('hub-mute').checked !== GS.audio.muted) GS.audio.toggleMute();
      });
      $('hub-edit').addEventListener('click', () => {
        this.root.classList.add('hidden');
        GS.creator.open({
          mode: 'edit',
          onSave: (hero) => { if (this.onSave) this.onSave(hero); },
          onClose: () => {
            if (!this.isOpen) return;
            this._profile();
            this.root.classList.remove('hidden');
            $('hub-edit').focus();
          },
        });
      });
      doc.addEventListener('keydown', (event) => {
        if (!this.isOpen || GS.creator.isOpen) return;
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopImmediatePropagation(); this.close();
        } else if (event.key === 'Tab') {
          const nodes = [...this.root.querySelectorAll('button, input')].filter((n) => n.getClientRects().length && !n.disabled);
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey ? doc.activeElement === first : doc.activeElement === last) {
            event.preventDefault(); (event.shiftKey ? last : first).focus();
          }
        }
      }, true);
    }
    open(view, { onSave, onClose, resident, appearance } = {}) {
      if (this.isOpen) this.close();
      this.returnFocus = this.doc.activeElement;
      this.onSave = onSave; this.onClose = onClose;
      this.isOpen = true;
      ['profile', 'settings', 'dialogue'].forEach((id) => this.$('hub-' + id).classList.toggle('hidden', id !== view));
      this.$('hub-title').textContent = { profile: 'Profilim', settings: 'Ayarlar', dialogue: 'Bölgeden bir ses' }[view];
      if (view === 'profile') this._profile();
      if (view === 'settings') {
        const settings = GS.audio.getSettings();
        this.root.querySelectorAll('[data-channel]').forEach((input) => {
          input.value = Math.round(settings[input.dataset.channel] * 100);
          input.nextElementSibling.textContent = input.value + '%';
        });
        this.$('hub-mute').checked = settings.muted;
      }
      if (view === 'dialogue') {
        this.$('hub-resident-name').textContent = resident.name;
        this.$('hub-speech').textContent = resident.text;
        this.$('hub-tip').textContent = resident.tip;
        GS.CharacterRenderer.drawPortrait(this.$('hub-resident'), appearance);
      }
      this.root.classList.remove('hidden');
      this.$('hub-close').focus();
    }
    _profile() {
      const hero = GS.creator.current, summary = GS.achievements.summary();
      this.$('hub-name').textContent = hero.name;
      GS.CharacterRenderer.drawPortrait(this.$('hub-portrait'), hero);
      this.$('hub-best').textContent = GS.readBestScore().toLocaleString('tr-TR');
      this.$('hub-badges').textContent = summary.badges + ' / ' + summary.badgeTotal;
      this.$('hub-streak').textContent = GS.daily.status().streak + ' gün';
    }
    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.root.classList.add('hidden');
      const callback = this.onClose;
      this.onClose = null; this.onSave = null;
      if (callback) callback();
      if (this.returnFocus && this.returnFocus.isConnected) this.returnFocus.focus();
    }
  }
  GS.PlayerHub = PlayerHub;
})(window.GS = window.GS || {});
