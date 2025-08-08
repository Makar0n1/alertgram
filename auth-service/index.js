const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const TelegramBot = require('node-telegram-bot-api');
const { Kafka } = require('kafkajs');

const prisma = new PrismaClient();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
const kafka = new Kafka({ clientId: 'auth-service', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

// Подключаем Kafka producer при старте
(async () => {
  try {
    await producer.connect();
    fastify.log.info('Kafka producer connected');
  } catch (e) {
    fastify.log.error('Kafka producer connect error: ' + e.message);
  }
})();

fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3001'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Логирование конфигурации
fastify.log.info(`Auth Service: client_id=${process.env.GOOGLE_CLIENT_ID}, redirect_uri=${process.env.GOOGLE_REDIRECT_URI}`);

// Декоратор для проверки JWT
fastify.decorateRequest('user', null);
fastify.addHook('preHandler', async (req, reply) => {
  const publicRoutes = ['/register', '/verify', '/login', '/oauth/google', '/oauth/callback'];
  if (publicRoutes.includes(req.url)) return;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    fastify.log.error('JWT: Токен отсутствует');
    return reply.status(401).send({ error: 'Токен отсутствует' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    fastify.log.error(`JWT: Ошибка верификации токена: ${err.message}`);
    reply.status(401).send({ error: 'Неверный токен' });
  }
});

// Регистрация
fastify.post('/register', async (req, reply) => {
  const { nickname, email, password, confirmPassword, telegramId } = req.body;
  if (password !== confirmPassword) {
    return reply.status(400).send({ error: 'Пароли не совпадают' });
  }
  if (!/^\d+$/.test(telegramId)) {
    return reply.status(400).send({ error: 'Telegram ID должен быть числом' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { telegramId }],
      },
    });
    if (existingUser) {
      return reply.status(400).send({ error: 'Пользователь с таким email или Telegram ID уже существует' });
    }
  } catch (err) {
    fastify.log.error(`Ошибка проверки уникальности: ${err.message}`);
    return reply.status(500).send({ error: 'Ошибка сервера' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationCode = Math.random().toString(36).slice(-6);
  const persistentId = require('crypto').randomUUID();

  try {
    fastify.log.info(`Отправка верификационного кода на Telegram ID: ${telegramId}`);
    await bot.sendMessage(telegramId, `Ваш код верификации: ${verificationCode}`);
    fastify.log.info(`Код успешно отправлен на Telegram ID: ${telegramId}`);

    const user = await prisma.user.create({
      data: {
        persistentId,
        nickname,
        email,
        password: hashedPassword,
        telegramId,
        authTokens: {
          create: { token: verificationCode, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        },
      },
    });
    reply.send({ userId: user.id, message: 'Код отправлен в Telegram' });
  } catch (err) {
    fastify.log.error(`Ошибка при регистрации: ${err.message}`);
    if (err.message.includes('ETELEGRAM')) {
      reply.status(400).send({ error: `Ошибка Telegram: ${err.message}` });
    } else {
      reply.status(500).send({ error: err.message });
    }
  }
});

// Верификация кода
fastify.post('/verify', async (req, reply) => {
  const { userId, code } = req.body;
  const token = await prisma.authToken.findFirst({
    where: { userId, token: code, expiresAt: { gt: new Date() } },
  });
  if (!token) {
    return reply.status(400).send({ error: 'Неверный или просроченный код' });
  }
  const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  await prisma.authToken.delete({ where: { id: token.id } });
  await prisma.authToken.create({
    data: {
      userId,
      token: jwtToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  reply.send({ token: jwtToken });
});

// Логин
fastify.post('/login', async (req, reply) => {
  const { login, password } = req.body;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: login }, { nickname: login }],
    },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return reply.status(401).send({ error: 'Неверный логин или пароль' });
  }

  const existingToken = await prisma.authToken.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingToken) {
    reply.send({ token: existingToken.token });
  } else {
    const verificationCode = Math.random().toString(36).slice(-6);
    try {
      fastify.log.info(`Отправка верификационного кода на Telegram ID: ${user.telegramId}`);
      await bot.sendMessage(user.telegramId, `Ваш код верификации: ${verificationCode}`);
      fastify.log.info(`Код успешно отправлен на Telegram ID: ${user.telegramId}`);
      await prisma.authToken.create({
        data: {
          userId: user.id,
          token: verificationCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      reply.send({ userId: user.id, message: 'Код отправлен в Telegram' });
    } catch (err) {
      fastify.log.error(`Ошибка при логине: ${err.message}`);
      reply.status(400).send({ error: `Ошибка Telegram: ${err.message}` });
    }
  }
});

// Получение профиля
fastify.get('/profile', async (req, reply) => {
  const userId = req.user.userId;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, email: true, telegramId: true },
    });
    if (!user) {
      return reply.status(404).send({ error: 'Пользователь не найден' });
    }
    reply.send(user);
  } catch (err) {
    fastify.log.error(`Ошибка получения профиля: ${err.message}`);
    reply.status(500).send({ error: err.message });
  }
});

// Обновление профиля
fastify.post('/profile', async (req, reply) => {
  const { currentPassword, newPassword, newNickname, newEmail, newTelegramId } = req.body;
  const userId = req.user.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return reply.status(401).send({ error: 'Неверный пароль' });
  }

  const updateData = {};
  if (newPassword) {
    updateData.password = await bcrypt.hash(newPassword, 10);
  }
  if (newNickname) {
    updateData.nickname = newNickname;
  }
  if (newEmail) {
    updateData.email = newEmail;
  }
  if (newTelegramId) {
    const verificationCode = Math.random().toString(36).slice(-6);
    try {
      fastify.log.info(`Отправка верификационного кода на новый Telegram ID: ${newTelegramId}`);
      await bot.sendMessage(newTelegramId, `Ваш код верификации: ${verificationCode}`);
      fastify.log.info(`Код успешно отправлен на новый Telegram ID: ${newTelegramId}`);
      await prisma.authToken.create({
        data: {
          userId,
          token: verificationCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      updateData.telegramId = newTelegramId;
    } catch (err) {
      fastify.log.error(`Ошибка при обновлении Telegram ID: ${err.message}`);
      reply.status(400).send({ error: `Ошибка Telegram: ${err.message}` });
      return;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  reply.send({ message: 'Профиль обновлён' });
});

// OAuth: Получение URL для Google
fastify.get('/oauth/google', async (req, reply) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  fastify.log.info(`OAuth: Получен токен: ${token}`);
  if (!token) {
    fastify.log.error('OAuth: Токен отсутствует');
    return reply.status(401).send({ error: 'Токен отсутствует' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    fastify.log.info(`OAuth: JWT токен валиден, userId=${decoded.userId}`);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: ['https://mail.google.com/', 'openid', 'email', 'profile'],
      state: decoded.userId,
    });
    fastify.log.info(`OAuth: Сгенерирован URL: ${url}`);
    reply.send({ url });
  } catch (err) {
    fastify.log.error(`OAuth: Ошибка генерации URL: ${err.message}`);
    reply.status(500).send({ error: `Ошибка генерации OAuth URL: ${err.message}` });
  }
});

// OAuth: Callback для Google
fastify.get('/oauth/callback', async (req, reply) => {
  const { code, state } = req.query;
  fastify.log.info(`OAuth Callback: Получен код=${code}, state=${state}`);
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fastify.log.info(`OAuth Callback: Получены токены: ${JSON.stringify(tokens)}`);
    oauth2Client.setCredentials(tokens);

    if (!tokens.id_token) {
      return reply.status(400).send({ error: 'Google не вернул id_token. Проверьте scopes/consent' });
    }

    const userId = state;
    const email = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    }).then(ticket => ticket.getPayload().email);

    const projectCount = await prisma.project.count({ where: { userId } });
    if (projectCount >= 5) {
      return reply.status(400).send({ error: 'Максимум 5 почтовых аккаунтов' });
    }

    // Проверяем существующий проект
    const existingProject = await prisma.project.findFirst({
      where: { userId, email },
    });

    let project;
    if (existingProject) {
      project = await prisma.project.update({
        where: { id: existingProject.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    } else {
      project = await prisma.project.create({
        data: {
          userId,
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }

    try {
      await producer.send({
        topic: 'reload_email_ingestor',
        messages: [{ value: JSON.stringify({ projectId: project.id }) }],
      });
    } catch (e) {
      fastify.log.error('Kafka send failed: ' + e.message);
    }

    // Создаём новый токен для сессии
    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    await prisma.authToken.create({
      data: {
        userId,
        token: jwtToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    reply.redirect(`http://localhost:3001/oauth/callback?token=${jwtToken}`);
  } catch (err) {
    fastify.log.error(`OAuth Callback: Ошибка: ${err.message}`);
    reply.status(500).send({ error: `Ошибка OAuth callback: ${err.message}` });
  }
});

fastify.listen({ port: 3003, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
});