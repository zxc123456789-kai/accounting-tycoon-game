/* Accounting Tycoon — a small bookkeeping practice game built with Phaser 3.90. */
(function () {
  'use strict';

  const W = 1280;
  const H = 920;
  const C = {
    paper: 0xf4f1e7, white: 0xfffdf8, ink: 0x233d35, muted: 0x75827a,
    line: 0xe5e0d3, green: 0x3e735b, greenDark: 0x2e5a47, greenPale: 0xe7efe5,
    orange: 0xe69b62, orangePale: 0xf8eadc, yellow: 0xeac66f, yellowPale: 0xf7f0d9,
    red: 0xc66e58, redPale: 0xf5e6df, bluePale: 0xe5edf0, shadow: 0xd9d3c5
  };
  const FONT = '"DM Sans", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  const MONO = '"DM Mono", "Microsoft JhengHei", monospace';

  const products = [
    { id: 'cup', name: '陶作隨行杯', en: 'CERAMIC CUP', price: 560, cost: 300, tone: 0xd99769, icon: 'cup' },
    { id: 'note', name: '日常手帳', en: 'DAILY NOTEBOOK', price: 480, cost: 300, tone: 0x86a78e, icon: 'book' },
    { id: 'tote', name: '城市帆布袋', en: 'CITY TOTE', price: 600, cost: 300, tone: 0x8a9ba8, icon: 'bag' }
  ];

  const missions = [
    {
      title: '向供應商賒購商品', tag: '採購 × 負債',
      story: '小店向供應商賒購 10 件商品，每件成本 $300，貨款尚未支付。',
      answer: 0,
      options: [
        '借：存貨 $3,000　／　貸：應付帳款 $3,000',
        '借：應付帳款 $3,000　／　貸：存貨 $3,000',
        '借：存貨 $3,000　／　貸：現金 $3,000',
        '借：進貨費用 $3,000　／　貸：銷貨收入 $3,000'
      ],
      explanation: '商品買進後，存貨這項資產增加，記在借方；貨款還沒付，代表應付帳款這項負債增加，記在貸方。'
    },
    {
      title: '以現金支付店面租金', tag: '費用 × 現金',
      story: '小店以現金支付本月店租 $5,000。',
      answer: 0,
      options: [
        '借：租金費用 $5,000　／　貸：現金 $5,000',
        '借：現金 $5,000　／　貸：租金費用 $5,000',
        '借：租金費用 $5,000　／　貸：應付帳款 $5,000',
        '借：業主資本 $5,000　／　貸：現金 $5,000'
      ],
      explanation: '租金是本期發生的費用，費用增加記借方；付出現金後，現金資產減少，記貸方。'
    },
    {
      title: '業主投入開業資金', tag: '業主權益 × 現金',
      story: '業主投入現金 $50,000，做為小店的開業資金。',
      answer: 0,
      options: [
        '借：現金 $50,000　／　貸：業主資本 $50,000',
        '借：業主資本 $50,000　／　貸：現金 $50,000',
        '借：現金 $50,000　／　貸：銷貨收入 $50,000',
        '借：租金費用 $50,000　／　貸：業主資本 $50,000'
      ],
      explanation: '業主投入資金，使商店的現金資產增加（借方），同時業主權益中的資本增加（貸方）。'
    }
  ];

  const freshState = () => ({
    cash: 50000, inventory: { cup: 0, note: 0, tote: 0 }, sales: 0,
    payable: 0, rentPaid: false, points: 0, answers: [null, null, null],
    toast: '開店日！先整理貨架，再迎接第一位顧客。'
  });

  class StoreScene extends Phaser.Scene {
    constructor() { super('Store'); }

    create() {
      this.state = freshState();
      this.activeQuiz = -1;
      this.draw();
      this.scale.on('resize', () => this.draw());
    }

    text(x, y, value, size, color = C.ink, weight = 500, opts = {}) {
      const node = this.add.text(x, y, value, {
        fontFamily: opts.mono ? MONO : FONT, fontSize: size, color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: weight >= 700 ? 'bold' : 'normal',
        lineSpacing: opts.lineSpacing || 4,
        wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
        align: opts.align || 'left',
        fixedWidth: opts.fixedWidth, fixedHeight: opts.fixedHeight,
        padding: opts.padding || { x: 0, y: 0 }
      });
      if (this.ui) this.ui.add(node);
      return node;
    }

    box(x, y, w, h, fill = C.white, radius = 16, stroke = C.line) {
      this.g.fillStyle(C.shadow, 0.20); this.g.fillRoundedRect(x, y + 3, w, h, radius);
      this.g.fillStyle(fill, 1); this.g.fillRoundedRect(x, y, w, h, radius);
      if (stroke !== null) { this.g.lineStyle(1, stroke, 1); this.g.strokeRoundedRect(x + .5, y + .5, w - 1, h - 1, radius); }
    }

    pill(x, y, w, h, label, fill, color, size = 12) {
      this.g.fillStyle(fill, 1); this.g.fillRoundedRect(x, y, w, h, h / 2);
      const t = this.text(x + w / 2, y + h / 2, label, size, color, 700, { align: 'center' });
      t.setOrigin(0.5, 0.5); t.setFixedSize(w, h);
      return t;
    }

    button(x, y, w, h, label, action, style = 'primary', size = 13) {
      const fills = style === 'primary' ? [C.green, C.greenDark, 0xffffff]
        : style === 'orange' ? [C.orange, 0xd5844e, C.ink]
        : style === 'soft' ? [C.greenPale, 0xd8e5d7, C.greenDark]
        : style === 'disabled' ? [0xece9df, 0xece9df, C.muted]
        : [C.white, 0xf1eee5, C.ink];
      this.g.fillStyle(fills[0], 1); this.g.fillRoundedRect(x, y, w, h, 11);
      const labelText = this.text(x + w / 2, y + h / 2, label, size, fills[2], 700, { align: 'center' });
      labelText.setOrigin(0.5); labelText.setFixedSize(w - 10, h);
      if (style !== 'disabled') {
        const hit = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        if (this.ui) this.ui.add(hit);
        hit.on('pointerover', () => { this.g.fillStyle(fills[1], 1); this.g.fillRoundedRect(x, y, w, h, 11); });
        hit.on('pointerout', () => { this.g.fillStyle(fills[0], 1); this.g.fillRoundedRect(x, y, w, h, 11); });
        hit.on('pointerdown', action);
      }
    }

    labelCaps(x, y, text) {
      this.text(x, y, text, 10, C.muted, 700);
    }

    drawStoreIllustration() {
      const x = 67, y = 286;
      // illustrated storefront, shelves and plants
      this.g.fillStyle(0xf4ead5, 1); this.g.fillRoundedRect(x, y, 346, 178, 15);
      this.g.fillStyle(0xe5d7b8, 1); this.g.fillRoundedRect(x + 18, y + 22, 190, 132, 8);
      this.g.fillStyle(C.green, 1); this.g.fillRoundedRect(x + 9, y + 12, 208, 25, 6);
      this.text(x + 112, y + 18, 'MORI  ·  GOODS', 11, C.white, 700, { align: 'center' }).setOrigin(.5, 0);
      this.g.fillStyle(0xfffdf8, 1); this.g.fillRoundedRect(x + 28, y + 48, 170, 98, 4);
      this.g.fillStyle(0xdde7d6, 1); this.g.fillRoundedRect(x + 35, y + 60, 72, 77, 4);
      this.g.fillStyle(0xf6d8aa, 1); this.g.fillRoundedRect(x + 119, y + 60, 70, 77, 4);
      this.g.fillStyle(C.green, 1); this.g.fillRoundedRect(x + 39, y + 104, 64, 4, 2);
      this.g.fillStyle(0x7ca480, 1); this.g.fillRoundedRect(x + 48, y + 79, 20, 25, 6);
      this.g.fillStyle(0xcbd8c8, 1); this.g.fillRoundedRect(x + 140, y + 86, 31, 36, 4);
      this.g.fillStyle(0xe9bd84, 1); this.g.fillRoundedRect(x + 137, y + 77, 37, 12, 4);
      this.g.fillStyle(0xd4a678, 1); this.g.fillRoundedRect(x + 105, y + 99, 7, 42, 3);
      this.g.fillStyle(0xb9cba7, 1); this.g.fillRoundedRect(x + 93, y + 94, 30, 10, 5);
      this.g.fillStyle(0xe9d0ad, 1); this.g.fillRoundedRect(x + 238, y + 105, 52, 42, 7);
      this.g.fillStyle(0x73916d, 1); this.g.fillEllipse(x + 266, y + 88, 48, 28);
      this.g.fillStyle(0x8da77e, 1); this.g.fillEllipse(x + 250, y + 76, 27, 39);
      this.g.fillStyle(0xa0b58a, 1); this.g.fillEllipse(x + 281, y + 72, 27, 37);
      this.g.fillStyle(0x73916d, 1); this.g.fillRoundedRect(x + 264, y + 86, 5, 25, 2);
      this.g.fillStyle(0xe4d9c2, 1); this.g.fillRect(x + 29, y + 151, 260, 5);
      this.text(x + 173, y + 161, '慢一點，帳也要記清楚。', 11, 0x7b796e, 500, { align: 'center' }).setOrigin(.5, 0);
    }

    draw() {
      if (this.ui) this.ui.destroy(true);
      this.ui = this.add.container(0, 0);
      this.g = this.add.graphics(); this.ui.add(this.g);
      this.g.fillStyle(C.paper, 1); this.g.fillRect(0, 0, W, H);
      this.g.fillStyle(0xeae5d7, .5); this.g.fillEllipse(1070, 30, 300, 150);

      // Heading
      this.pill(44, 26, 122, 25, 'DAY 01  /  開店日', C.yellowPale, 0x8a6f35, 10);
      this.text(44, 58, '會計小店長', 33, C.ink, 800);
      this.text(48, 101, 'ACCOUNTING TYCOON', 10, C.muted, 700);
      this.text(358, 73, '從第一筆交易開始，讓 Mori 小店穩穩成長。', 14, C.muted, 500);
      this.g.fillStyle(C.white, 1); this.g.fillRoundedRect(1062, 38, 174, 48, 14);
      this.g.lineStyle(1, C.line, 1); this.g.strokeRoundedRect(1062.5, 38.5, 173, 47, 14);
      this.g.fillStyle(C.yellow, 1); this.g.fillCircle(1085, 62, 10);
      this.text(1103, 48, '學習積分', 10, C.muted, 700);
      this.text(1103, 62, String(this.state.points).padStart(2, '0') + ' pts', 15, C.ink, 700);

      // Account dashboard
      const statX = [44, 347, 650, 953];
      const stats = [
        { label: '可用現金', value: this.money(this.state.cash), foot: 'CASH ON HAND', icon: '＄', tone: C.greenPale, ink: C.greenDark },
        { label: '商品庫存', value: this.stockCount() + ' 件', foot: 'ITEMS IN STOCK', icon: '▤', tone: C.orangePale, ink: 0xb66d40 },
        { label: '累計銷貨', value: this.money(this.state.sales), foot: 'TOTAL SALES', icon: '↗', tone: C.bluePale, ink: 0x5c7a88 },
        { label: '應付帳款', value: this.money(this.state.payable), foot: 'ACCOUNTS PAYABLE', icon: '≡', tone: C.yellowPale, ink: 0x9b7c3a }
      ];
      for (let i = 0; i < stats.length; i++) {
        const s = stats[i], x = statX[i];
        this.box(x, 128, 283, 85, C.white, 15);
        this.g.fillStyle(s.tone, 1); this.g.fillRoundedRect(x + 16, 146, 42, 42, 13);
        this.text(x + 37, 166, s.icon, 19, s.ink, 700, { align: 'center' }).setOrigin(.5);
        this.text(x + 70, 143, s.label, 12, C.muted, 600);
        this.text(x + 70, 161, s.value, 21, C.ink, 800);
        this.text(x + 70, 190, s.foot, 8, 0x9ca39a, 700);
      }

      // Store / management panels
      this.box(44, 232, 396, 313, C.white, 17);
      this.text(66, 250, 'MORI 小店', 17, C.ink, 800);
      this.pill(333, 249, 84, 23, this.state.rentPaid ? '租金已付 ✓' : '營業中', this.state.rentPaid ? C.greenPale : C.orangePale, this.state.rentPaid ? C.greenDark : 0xa3633c, 9);
      this.drawStoreIllustration();
      if (this.state.rentPaid) {
        this.button(69, 481, 344, 42, '本日租金已支付', () => {}, 'disabled', 13);
      } else if (this.state.cash >= 5000) {
        this.button(69, 481, 344, 42, '支付本日租金  $5,000', () => this.payRent(), 'soft', 13);
      } else {
        this.button(69, 481, 344, 42, '現金不足，無法支付租金', () => {}, 'disabled', 12);
      }

      this.box(458, 232, 778, 313, C.white, 17);
      this.text(482, 250, '商品管理', 17, C.ink, 800);
      this.text(482, 274, '現金進貨 5 件／賒購進貨 10 件；售出商品即可收到現金。', 11, C.muted, 500);
      const px = [478, 730, 982];
      products.forEach((p, idx) => this.drawProductCard(px[idx], 305, p));

      // Accounting missions
      this.text(44, 570, '會計任務', 19, C.ink, 800);
      this.text(149, 576, 'JOURNAL ENTRY PRACTICE', 9, C.muted, 700);
      this.text(1007, 576, '答題可得積分，完成後可回看解析。', 10, C.muted, 500);
      missions.forEach((m, i) => this.drawMissionCard(44 + i * 404, 608, i));

      // Footer callout
      this.g.fillStyle(0xe8eadf, 1); this.g.fillRoundedRect(44, 847, 1192, 43, 13);
      this.g.fillStyle(C.green, 1); this.g.fillCircle(67, 868, 7);
      const status = this.state.toast || '記帳小提醒：資產、費用增加記借方；負債、業主權益增加記貸方。';
      this.text(84, 857, status, 12, C.ink, 600);
      this.text(1210, 859, 'TIP', 9, C.greenDark, 800, { align: 'right' });

      if (this.activeQuiz >= 0) this.drawQuiz(this.activeQuiz);

    }

    drawProductCard(x, y, p) {
      this.g.fillStyle(0xf8f6ef, 1); this.g.fillRoundedRect(x, y, 234, 236, 13);
      this.g.lineStyle(1, 0xeee9dc, 1); this.g.strokeRoundedRect(x + .5, y + .5, 233, 235, 13);
      this.g.fillStyle(p.tone, .18); this.g.fillCircle(x + 38, y + 39, 22);
      this.drawProductIcon(x + 38, y + 39, p);
      this.text(x + 70, y + 24, p.name, 13, C.ink, 700);
      this.text(x + 70, y + 46, p.en, 8, C.muted, 700);
      this.text(x + 15, y + 75, `售價 ${this.money(p.price)}`, 11, C.ink, 600);
      this.text(x + 15, y + 95, `成本 ${this.money(p.cost)}   庫存 ${this.state.inventory[p.id]} 件`, 10, C.muted, 500);
      this.button(x + 13, y + 120, 208, 31, `現金進貨 +5  ·  ${this.money(p.cost * 5)}`, () => this.restock(p, false), 'soft', 10);
      this.button(x + 13, y + 158, 208, 31, `賒購補貨 +10  ·  ${this.money(p.cost * 10)}`, () => this.restock(p, true), 'outline', 10);
      if (this.state.inventory[p.id] > 0) {
        this.button(x + 13, y + 196, 208, 31, `售出 1 件  ·  收入 ${this.money(p.price)}`, () => this.sell(p), 'orange', 10);
      } else {
        this.button(x + 13, y + 196, 208, 31, '尚無庫存可售', () => {}, 'disabled', 10);
      }
    }

    drawProductIcon(x, y, product) {
      const col = product.tone;
      if (product.icon === 'cup') {
        this.g.fillStyle(col, 1); this.g.fillRoundedRect(x - 10, y - 10, 20, 25, 4);
        this.g.lineStyle(3, col, 1); this.g.strokeCircle(x + 12, y - 1, 6);
        this.g.fillStyle(0xfffdf8, .85); this.g.fillRoundedRect(x - 7, y - 6, 14, 4, 2);
      } else if (product.icon === 'book') {
        this.g.fillStyle(col, 1); this.g.fillRoundedRect(x - 11, y - 13, 22, 27, 3);
        this.g.fillStyle(0xfffdf8, .85); this.g.fillRect(x - 7, y - 8, 14, 2);
        this.g.fillRect(x - 7, y - 3, 14, 2); this.g.fillRect(x - 7, y + 2, 10, 2);
      } else {
        this.g.lineStyle(4, col, 1); this.g.strokeRoundedRect(x - 12, y - 5, 24, 19, 3);
        this.g.beginPath(); this.g.arc(x, y - 5, 7, Math.PI, 0, false); this.g.strokePath();
      }
    }

    drawMissionCard(x, y, i) {
      const m = missions[i], result = this.state.answers[i];
      const done = result !== null;
      this.box(x, y, 384, 218, C.white, 16);
      this.g.fillStyle(done ? C.greenPale : C.orangePale, 1); this.g.fillRoundedRect(x + 17, y + 17, 34, 34, 11);
      this.text(x + 34, y + 34, `0${i + 1}`, 12, done ? C.greenDark : 0xb66d40, 800, { align: 'center' }).setOrigin(.5);
      this.text(x + 62, y + 17, m.title, 14, C.ink, 800);
      this.pill(x + 256, y + 19, 109, 22, m.tag, C.greenPale, C.greenDark, 8);
      this.text(x + 19, y + 68, m.story, 11, C.muted, 500, { wrap: 342, lineSpacing: 5 });
      this.g.fillStyle(0xeeeade, 1); this.g.fillRoundedRect(x + 18, y + 124, 348, 1, 1);
      if (done) {
        this.pill(x + 20, y + 145, 94, 23, result.correct ? '答對 +' + result.earned : '已作答 +' + result.earned, result.correct ? C.greenPale : C.yellowPale, result.correct ? C.greenDark : 0x8a6f35, 9);
        this.button(x + 242, y + 143, 124, 39, '查看解析  ↗', () => { this.activeQuiz = i; this.draw(); }, 'outline', 11);
      } else {
        this.text(x + 20, y + 145, '想一想：這筆交易讓哪些科目增加？', 10, C.muted, 500);
        this.button(x + 242, y + 143, 124, 39, '開始作答  →', () => { this.activeQuiz = i; this.draw(); }, 'primary', 11);
      }
    }

    drawQuiz(i) {
      const result = this.state.answers[i];
      const m = missions[i];
      this.g.fillStyle(0x182b27, .57); this.g.fillRect(0, 0, W, H);
      this.box(278, 117, 724, 690, C.white, 23, null);
      this.pill(316, 146, 94, 23, `任務 0${i + 1}`, C.orangePale, 0xb66d40, 10);
      this.button(927, 143, 36, 34, '×', () => { this.activeQuiz = -1; this.draw(); }, 'outline', 18);
      this.text(316, 185, m.title, 24, C.ink, 800);
      this.text(316, 229, m.story, 14, C.muted, 500, { wrap: 640, lineSpacing: 7 });
      this.text(316, 291, result ? '你選擇的分錄' : '請選出正確的會計分錄', 12, C.ink, 700);

      m.options.forEach((option, oi) => {
        const oy = 323 + oi * 65;
        const isCorrect = oi === m.answer;
        const isPicked = result && result.choice === oi;
        let fill = 0xf8f6ef, stroke = 0xece7da, ink = C.ink;
        if (result && isCorrect) { fill = 0xe7efe5; stroke = 0x99b59c; ink = C.greenDark; }
        else if (result && isPicked) { fill = 0xf5e6df; stroke = 0xd59a87; ink = 0x9c5647; }
        this.g.fillStyle(fill, 1); this.g.fillRoundedRect(316, oy, 648, 52, 12);
        this.g.lineStyle(1, stroke, 1); this.g.strokeRoundedRect(316.5, oy + .5, 647, 51, 12);
        this.g.fillStyle(result && isCorrect ? C.green : 0xe8e2d5, 1); this.g.fillCircle(339, oy + 26, 11);
        this.text(339, oy + 26, String.fromCharCode(65 + oi), 10, result && isCorrect ? C.white : C.muted, 800, { align: 'center' }).setOrigin(.5);
        this.text(362, oy + 15, option, 12, ink, result && isCorrect ? 700 : 500);
        if (!result) {
          const hit = this.add.rectangle(640, oy + 26, 648, 52, 0xffffff, .001).setInteractive({ useHandCursor: true });
          this.ui.add(hit);
          hit.on('pointerover', () => { this.g.fillStyle(0xf1eee5, 1); this.g.fillRoundedRect(316, oy, 648, 52, 12); });
          hit.on('pointerout', () => { this.g.fillStyle(fill, 1); this.g.fillRoundedRect(316, oy, 648, 52, 12); });
          hit.on('pointerdown', () => this.submitAnswer(i, oi));
        }
      });

      if (result) {
        const correct = result.correct;
        this.g.fillStyle(correct ? C.greenPale : C.yellowPale, 1); this.g.fillRoundedRect(316, 594, 648, 130, 15);
        this.text(338, 611, correct ? '答對了！分錄方向正確。' : '再記住這個判斷方式。', 14, correct ? C.greenDark : 0x8a6f35, 800);
        this.text(338, 640, '正確答案：' + m.options[m.answer], 11, C.ink, 700, { wrap: 600, lineSpacing: 5 });
        this.text(338, 675, m.explanation, 10, C.muted, 500, { wrap: 600, lineSpacing: 5 });
        this.pill(827, 691, 117, 22, `+${result.earned} 學習積分`, correct ? 0xd6e6d6 : 0xeee4c9, correct ? C.greenDark : 0x8a6f35, 9);
        this.button(793, 751, 170, 39, i === 2 ? '完成任務  ✓' : '繼續下一題  →', () => {
          this.activeQuiz = i < 2 && this.state.answers[i + 1] === null ? i + 1 : -1;
          this.draw();
        }, 'primary', 11);
      } else {
        this.text(316, 602, '小提示：先找出變動的科目，再判斷它屬於資產、負債、費用或業主權益。', 10, C.muted, 500, { wrap: 640 });
        this.text(316, 645, '答對 +30 分　·　完成作答 +5 分', 10, 0x9b7c3a, 700);
      }
    }

    money(n) { return '$' + Math.max(0, Math.round(n)).toLocaleString('en-US'); }
    stockCount() { return Object.values(this.state.inventory).reduce((a, b) => a + b, 0); }

    restock(product, credit) {
      const qty = credit ? 10 : 5;
      const amount = product.cost * qty;
      if (!credit && this.state.cash < amount) { this.notice('現金不足，先銷售商品或選擇賒購補貨。'); return; }
      this.state.inventory[product.id] += qty;
      if (credit) {
        this.state.payable += amount;
        this.notice(`已向供應商賒購 ${product.name} ${qty} 件，應付帳款增加 ${this.money(amount)}。`);
      } else {
        this.state.cash -= amount;
        this.notice(`現金進貨 ${product.name} ${qty} 件，付出 ${this.money(amount)}。`);
      }
      this.draw();
    }

    sell(product) {
      if (this.state.inventory[product.id] <= 0) return;
      this.state.inventory[product.id] -= 1;
      this.state.cash += product.price;
      this.state.sales += product.price;
      this.notice(`售出 1 件${product.name}，收到現金 ${this.money(product.price)}。`);
      this.draw();
    }

    payRent() {
      if (this.state.rentPaid || this.state.cash < 5000) return;
      this.state.cash -= 5000;
      this.state.rentPaid = true;
      this.notice('已支付本日店租 $5,000；租金屬於本期費用。');
      this.draw();
    }

    submitAnswer(i, choice) {
      if (this.state.answers[i] !== null) return;
      const correct = choice === missions[i].answer;
      const earned = correct ? 30 : 5;
      this.state.answers[i] = { choice, correct, earned };
      this.state.points += earned;
      this.notice(correct ? `答對了！獲得 ${earned} 點學習積分。` : `已完成作答，獲得 ${earned} 點；看看正確答案與解析。`);
      this.draw();
    }

    notice(message) { this.state.toast = message; }
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#f4f1e7',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    render: { antialias: true, roundPixels: false },
    scene: [StoreScene]
  };

  new Phaser.Game(config);
}());
