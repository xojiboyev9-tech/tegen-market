import { config } from 'dotenv';
config({ path: ['.env', '../../.env'] });
import { Bot, Context, InlineKeyboard, Keyboard } from 'grammy';
import { api, ApiError } from './api';

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error('BOT_TOKEN kerak');
const MINI_APP = (process.env.MINI_APP_URL ?? '').replace(/\/$/, '');
const ADMIN_APP = (process.env.ADMIN_APP_URL ?? '').replace(/\/$/, '');
const ALLOW_FILES = process.env.ALLOW_FILES === 'true';

const bot = new Bot(TOKEN);

const BTN = {
  catalog: '🛍 Katalog', cart: '🛒 Savatcha', orders: '📦 Buyurtmalarim', card: '💳 Diskont karta',
  ask: '💬 Savol berish', fav: '⭐ Sevimlilar', about: 'ℹ️ Biz haqida', cancel: '❌ Bekor qilish',
};
const MENU_TEXTS = new Set(Object.values(BTN));

const menu = () =>
  new Keyboard()
    .webApp(BTN.catalog, `${MINI_APP}/#/`).webApp(BTN.cart, `${MINI_APP}/#/cart`).row()
    .text(BTN.orders).text(BTN.card).row()
    .text(BTN.ask).webApp(BTN.fav, `${MINI_APP}/#/favorites`).row()
    .text(BTN.about)
    .resized();

const STATUS_UZ: Record<string, string> = {
  NEW: '🆕 Yangi', ACCEPTED: '👍 Qabul qilindi', PREPARING: '👨‍🍳 Tayyorlanmoqda', READY: '🎉 Tayyor',
  DELIVERING: '🚚 Yo\'lda', COMPLETED: '✅ Yakunlandi', CANCELLED: '❌ Bekor qilindi',
};

const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Xatolik yuz berdi, birozdan so\'ng urinib ko\'ring.');

async function showMenu(ctx: Context, text = 'Asosiy menyu') {
  await ctx.reply(text, { reply_markup: menu() });
}

// ---------- /start: telefon, ism, menyu ----------
bot.command('start', async (ctx) => {
  if (!ctx.from) return;
  try {
    const r = await api('/start', 'POST', { telegramId: ctx.from.id, username: ctx.from.username, firstName: ctx.from.first_name });
    if (r.needPhone) {
      return ctx.reply('Assalomu alaykum! 👋 Tegen do\'koniga xush kelibsiz.\n\nBuyurtma berish uchun telefon raqamingizni yuboring.', {
        reply_markup: new Keyboard().requestContact('📱 Raqamni yuborish').resized().oneTime(),
      });
    }
    if (r.needName) return askName(ctx, r.user.name);
    await showMenu(ctx, `Xush kelibsiz, ${r.user.name ?? ''}! Nimadan boshlaymiz?`);
  } catch (e) { await ctx.reply(msg(e)); }
});

async function askName(ctx: Context, suggested?: string | null) {
  await api('/state', 'POST', { telegramId: ctx.from!.id, state: 'name' });
  const kb = suggested ? new Keyboard().text(suggested).resized().oneTime() : { remove_keyboard: true as const };
  await ctx.reply('Ismingizni yozing:', { reply_markup: kb });
}

bot.on('message:contact', async (ctx) => {
  const c = ctx.message.contact;
  // Faqat o'z raqamini yuborishi mumkin (boshqa odamning kontaktini emas)
  if (c.user_id !== ctx.from.id) return ctx.reply('Iltimos, tugma orqali o\'z raqamingizni yuboring.');
  try {
    const r = await api('/phone', 'POST', { telegramId: ctx.from.id, phone: c.phone_number });
    if (!r.ok) return ctx.reply(r.reason);
    await askName(ctx, r.name);
  } catch (e) { await ctx.reply(msg(e)); }
});

// ---------- xodim buyruqlari ----------
bot.command('admin', async (ctx) => {
  if (!ctx.from) return;
  if (!ADMIN_APP.startsWith('https://')) return ctx.reply('Admin panel manzili (ADMIN_APP_URL, https) sozlanmagan.');
  try {
    const { token } = await api('/admin-token', 'POST', { telegramId: ctx.from.id });
    await ctx.reply('Admin panelni oching (havola 30 daqiqa amal qiladi):', {
      reply_markup: new InlineKeyboard().webApp('🛠 Admin panel', `${ADMIN_APP}/?token=${token}`),
    });
  } catch (e) { await ctx.reply(msg(e)); }
});

// Buyurtma holati tugmalari (xodim uchun)
const NEXT: Record<string, (fulfillment: string) => [string, string][]> = {
  NEW: () => [['ACCEPTED', '✅ Qabul qilish']],
  ACCEPTED: () => [['PREPARING', '👨‍🍳 Tayyorlash']],
  PREPARING: (f) => [f === 'PICKUP' ? ['READY', '🎉 Tayyor'] : ['DELIVERING', '🚚 Yo\'lga chiqdi']],
  READY: () => [['COMPLETED', '🏁 Topshirildi']],
  DELIVERING: () => [['COMPLETED', '🏁 Yetkazildi']],
};

bot.callbackQuery(/^ord:([A-Z]+):(\d+)$/, async (ctx) => {
  const [, status, id] = ctx.match;
  try {
    const o = await api('/orders/' + id + '/status', 'POST', { telegramId: ctx.from.id, status });
    const kb = new InlineKeyboard();
    for (const [s, label] of NEXT[o.status]?.(o.fulfillment) ?? []) kb.text(label, `ord:${s}:${id}`);
    if (['ACCEPTED', 'PREPARING'].includes(o.status)) kb.row().text('❌ Bekor qilish', `ord:CANCELLED:${id}`);
    await ctx.editMessageReplyMarkup({ reply_markup: kb }).catch(() => {});
    await ctx.answerCallbackQuery({ text: `${o.code}: ${STATUS_UZ[o.status]}` });
  } catch (e) { await ctx.answerCallbackQuery({ text: msg(e), show_alert: true }); }
});

// ---------- menyu tugmalari ----------
bot.hears(BTN.orders, async (ctx) => {
  try {
    const rows = await api<{ code: string; status: string; total: string }[]>(`/orders/${ctx.from!.id}`);
    if (!rows.length) return ctx.reply('Hozircha buyurtmalaringiz yo\'q. 🛍 Katalog orqali birinchi buyurtmani bering.');
    await ctx.reply(rows.map((o) => `<b>${o.code}</b>  ${STATUS_UZ[o.status] ?? o.status}\n${o.total}`).join('\n\n'), { parse_mode: 'HTML' });
  } catch (e) { await ctx.reply(msg(e)); }
});

const cancelKb = () => new Keyboard().text(BTN.cancel).resized();

bot.hears(BTN.card, async (ctx) => {
  await api('/state', 'POST', { telegramId: ctx.from!.id, state: 'card' }).catch(() => {});
  await ctx.reply('Karta raqamini yozing yoki kartaning rasmini yuboring. Xodim tekshirib, kartangizni biriktiradi.', { reply_markup: cancelKb() });
});

bot.hears(BTN.ask, async (ctx) => {
  await api('/state', 'POST', { telegramId: ctx.from!.id, state: 'support' }).catch(() => {});
  await ctx.reply('Savolingizni yozing yoki rasm / ovozli xabar / video yuboring. Javobni shu yerda olasiz.', { reply_markup: cancelKb() });
});

bot.hears(BTN.cancel, async (ctx) => {
  await api('/state', 'POST', { telegramId: ctx.from!.id, state: null }).catch(() => {});
  await showMenu(ctx);
});

bot.hears(BTN.about, (ctx) =>
  ctx.reply('Tegen: oziq-ovqat va uy-ro\'zg\'or mahsulotlari. Katalogdan tanlang, olib ketish yoki yetkazib berishni belgilang.'));

// ---------- qolgan barcha xabarlar ----------
const hasLink = (m: { entities?: { type: string }[]; caption_entities?: { type: string }[] }) =>
  [...(m.entities ?? []), ...(m.caption_entities ?? [])].some((e) => ['url', 'text_link', 'email', 'mention'].includes(e.type));

bot.on('message', async (ctx) => {
  const from = ctx.from;
  const m = ctx.message;
  if (!from || ctx.chat.type !== 'private') return;

  let user: any;
  try { user = await api(`/user/${from.id}`); } catch { return ctx.reply('Boshlash uchun /start bosing.'); }

  // 1) Ism kiritish
  if (user.botState === 'name' && m.text) {
    try {
      await api('/name', 'POST', { telegramId: from.id, name: m.text });
      await api('/state', 'POST', { telegramId: from.id, state: null });
      return showMenu(ctx, `Rahmat, ${m.text}! Asosiy menyu:`);
    } catch (e) { return ctx.reply(msg(e)); }
  }
  if (!user.phone) return ctx.reply('Avval /start bosib telefon raqamingizni yuboring.');

  // 2) Xodim botda mijoz murojaatiga reply qilib javob beradi
  if (['SUPER_ADMIN', 'OPERATOR'].includes(user.role) && m.reply_to_message) {
    const src = m.reply_to_message.text ?? m.reply_to_message.caption ?? '';
    const tag = /#T(\d+)/.exec(src);
    if (tag && m.text) {
      try { await api('/support/reply', 'POST', { telegramId: from.id, threadId: Number(tag[1]), text: m.text }); return ctx.reply('✅ Javob yuborildi'); }
      catch (e) { return ctx.reply(msg(e)); }
    }
  }

  // 3) Havola va fayllar yo'q (xavfsizlik)
  if (hasLink(m)) return ctx.reply('Havola yuborish mumkin emas. Savolingizni matn bilan yozing.');
  if (!ALLOW_FILES && (m.document || m.sticker || m.animation || m.audio || m.video_note)) {
    return ctx.reply('Fayl yuborish mumkin emas. Matn, rasm, ovozli xabar yoki video yuboring.');
  }

  // 4) Diskont karta
  if (user.botState === 'card') {
    try {
      if (m.photo) await api('/card', 'POST', { telegramId: from.id, fileId: m.photo[m.photo.length - 1].file_id });
      else if (m.text && /^[0-9A-Za-z\- ]{4,32}$/.test(m.text)) await api('/card', 'POST', { telegramId: from.id, number: m.text });
      else return ctx.reply('Karta raqamini (4-32 belgi) yozing yoki rasm yuboring.');
      await api('/state', 'POST', { telegramId: from.id, state: null });
      return showMenu(ctx, '✅ Qabul qilindi. Xodim tekshirib, kartangizni biriktiradi.');
    } catch (e) { return ctx.reply(msg(e)); }
  }

  // 5) Murojaat (matn, rasm, ovoz, video): menyu tugmasi bo'lmagan hamma narsa
  if (m.text && MENU_TEXTS.has(m.text)) return;
  let payload: { kind: string; text?: string; fileId?: string } | null = null;
  if (m.text) payload = { kind: 'text', text: m.text };
  else if (m.photo) payload = { kind: 'photo', text: m.caption, fileId: m.photo[m.photo.length - 1].file_id };
  else if (m.voice) payload = { kind: 'voice', text: m.caption, fileId: m.voice.file_id };
  else if (m.video) payload = { kind: 'video', text: m.caption, fileId: m.video.file_id };
  if (!payload) return ctx.reply('Bu turdagi xabarni qabul qila olmayman.');
  try {
    await api('/support', 'POST', { telegramId: from.id, ...payload });
    await api('/state', 'POST', { telegramId: from.id, state: null });
    await showMenu(ctx, '✅ Xabaringiz yuborildi. Javobni shu yerda olasiz.');
  } catch (e) { await ctx.reply(msg(e)); }
});

bot.catch((err) => console.error('bot xato:', err.error));
bot.start({ onStart: (me) => console.log(`@${me.username} ishga tushdi`) });
