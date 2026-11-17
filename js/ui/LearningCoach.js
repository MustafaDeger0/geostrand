(function (GS) {
  'use strict';

  // A small, non-modal walkthrough driven by real actions, not a timed slideshow.
  class LearningCoach {
    constructor(doc, openPad) {
      this.root = doc.createElement('section');
      this.root.className = 'learning-coach';
      this.root.setAttribute('aria-label', 'Uygulamalı eğitim');
      this.root.innerHTML = '<div role="status" aria-live="polite"><strong></strong><p></p></div>' +
        '<button type="button" class="btn-ghost">Pad’i aç</button>' +
        '<button type="button" class="btn-ghost">Eğitimi gizle</button>';
      this.title = this.root.querySelector('strong');
      this.text = this.root.querySelector('p');
      const buttons = this.root.querySelectorAll('button');
      buttons[0].addEventListener('click', openPad);
      buttons[1].addEventListener('click', () => { this.dismissed = true; this.root.hidden = true; });
      doc.body.appendChild(this.root);
    }

    static step(found, clueIds, solved) {
      if (solved) return { title: '4/4 · Bölgeyi çözdün', text: 'Pad’de gerçek konumu ve ipuçlarını karşılaştır. Sonraki bölgede yer şekli ve kıta sorularını da öğrenebilirsin. Bu modda rozet ve rekor kazanılmaz.' };
      if (!found.size) return { title: '1/4 · İlk ipucunu incele', text: 'Sarı okun gösterdiği ? nesnesine yürü. WASD/ok tuşlarını veya dokunmatik kaydırmayı kullan; yaklaşınca E’ye ya da İncele’ye bas. Su ve ısı azalmaz; acele etmen gerekmiyor.' };
      const missing = clueIds.filter((id) => !found.has(id));
      if (missing.length) return { title: '2/4 · Gözlemleri birleştir', text: 'İlk gözlemin Pad’e kaydedildi. Pad’i kapatıp kalan ' + missing.length + ' ipucunu bul. Bitki ve toprak iklimi, gölge ise yarım küre ile enlemi anlamana yardımcı olur.' };
      return { title: '3/4 · Konumunu tahmin et', text: 'Pad’i aç. Gölgenin yönünden yarım küreyi, uzunluğundan enlemi bul; cetveli kullanabilirsin. Bitki ve toprağı Rehber ile karşılaştır. Yanlış tahminde ceza yok; açıklamayı okuyup yeniden dene.' };
    }

    update(found, clueIds, solved) {
      const step = LearningCoach.step(found, clueIds, solved);
      if (this.title.textContent === step.title) return;
      this.title.textContent = step.title;
      this.text.textContent = step.text;
    }

    setVisible(visible) { this.root.hidden = !!this.dismissed || !visible; }
    destroy() { this.root.remove(); }
  }
  GS.LearningCoach = LearningCoach;
})(window.GS = window.GS || {});
