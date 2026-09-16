export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),

  databaseUrl: process.env.DATABASE_URL || '',

  botToken: process.env.BOT_TOKEN || '',
  botSecret: process.env.BOT_SECRET || '',
  adminSecret: process.env.ADMIN_SECRET || '',

  ownerTelegramId: process.env.OWNER_TELEGRAM_ID || '',

  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
});
