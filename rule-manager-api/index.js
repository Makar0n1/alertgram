const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const Imap = require('imap');

const prisma = new PrismaClient();

fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3001'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Декоратор для проверки JWT
fastify.decorateRequest('user', null);
fastify.addHook('preHandler', async (req, reply) => {
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

// Создание/обновление кастомного проекта
fastify.post('/projects', async (req, reply) => {
  const { id, email, password, host, port } = req.body;
  const userId = req.user.userId;
  const projectCount = await prisma.project.count({ where: { userId } });
  if (projectCount >= 5 && !id) {
    return reply.status(400).send({ error: 'Максимум 5 почтовых аккаунтов' });
  }
  const project = await prisma.project.upsert({
    where: { id: id || email },
    update: { password, host, port: parseInt(port) },
    create: { userId, email, password, host, port: parseInt(port) },
  });
  await fetch('http://email-ingestor:3002/reload', { method: 'POST' });
  reply.send(project);
});

// Удаление проекта
fastify.delete('/projects/:id', async (req, reply) => {
  const { id } = req.params;
  const userId = req.user.userId;
  try {
    await prisma.project.delete({ where: { id, userId } });
    await fetch('http://email-ingestor:3002/reload', { method: 'POST' });
    reply.send({ message: 'Проект удалён' });
  } catch (err) {
    reply.status(500).send({ error: err.message });
  }
});

// Добавление правила
fastify.post('/rules', async (req, reply) => {
  const { projectId, condition } = req.body;
  const rule = await prisma.rule.create({ data: { projectId, condition } });
  reply.send(rule);
});

// Получение проектов и правил
fastify.get('/projects', async (req, reply) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user.userId },
    include: { rules: true },
  });
  reply.send(projects);
});

// Тест email
fastify.post('/test-email', async (req, reply) => {
  const { email, password, host, port } = req.body;
  const imap = new Imap({ user: email, password, host, port: parseInt(port), tls: true });
  try {
    await new Promise((resolve, reject) => {
      imap.once('ready', () => resolve());
      imap.once('error', (err) => reject(err));
      imap.connect();
    });
    reply.send({ success: true });
  } catch (err) {
    reply.send({ success: false, error: err.message });
  } finally {
    imap.end();
  }
});

fastify.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) throw err;
});