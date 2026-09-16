import { Bot, InlineKeyboard, Keyboard } from 'grammy';

const token = process.env.BOT_TOKEN;
const apiUrl = (process.env.API_URL || '').replace(/\/$/, '');
const botSecret = process.env.BOT_SECRET || '';
const miniAppUrl = process.env.MINI_APP_URL || '';

if (!token) throw new Error('BOT_TOKEN o‘rnatilmagan');
if (!apiUrl) throw new Error('API_URL o‘rnatilmagan');

const bot = new Bot(token);

async function api(path: string, body: unknown) {
  const response = await fetch(`${apiUrl}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': botSecret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

const languageKeyboard = () =>
  new InlineKeyboard()
    .text('🇺🇿 O‘zbekcha', 'lang:uz')
    .text('🇷🇺 Русский', 'lang:ru');

const shopKeyboard = (language: string) =>
  new InlineKeyboard().webApp(
    language === 'ru'
      ? '🛍 Открыть магазин'
      : '🛍 Do‘konni ochish',
    miniAppUrl,
  );

bot.command('start', async (ctx) => {
  await ctx.reply(
    'Assalomu alaykum! Tegen do‘koniga xush kelibsiz.\n\nAvval telefon raqamingizni yuboring:',
    {
      reply_markup: new Keyboard()
        .requestContact('📱 Telefon raqamni yuborish')
        .resized()
        .oneTime(),
    },
  );
});

bot.on('message:contact', async (ctx) => {
  const contact = ctx.message.contact;

  if (contact.user_id && contact.user_id !== ctx.from.id) {
    await ctx.reply(
      'Iltimos, o‘zingizning telefon raqamingizni yuboring.',
    );
    return;
  }

  await api('/users/bot/register', {
    telegramId: String(ctx.from.id),
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    username: ctx.from.username,
    phone: contact.phone_number,
  });

  await ctx.reply(
    'Telefon raqamingiz qabul qilindi. Tilni tanlang:',
    {
      reply_markup: { remove_keyboard: true },
    },
  );

  await ctx.reply('Til / Язык', {
    reply_markup: languageKeyboard(),
  });
});

bot.callbackQuery(/^lang:(uz|ru)$/, async (ctx) => {
  const language = ctx.match[1];

  await api('/users/bot/register', {
    telegramId: String(ctx.from.id),
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    username: ctx.from.username,
    language,
  });

  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    language === 'ru'
      ? 'Язык выбран. Откройте магазин:'
      : 'Til tanlandi. Do‘konni oching:',
  );

  await ctx.reply(
    language === 'ru'
      ? '🛍 Открыть магазин'
      : '🛍 Do‘konni ochish',
    {
      reply_markup: shopKeyboard(language),
    },
  );
});

bot.catch((error) => {
  console.error('Bot error:', error);
});

bot.start();
