const fastify = require('fastify')({ logger: true });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

fastify.post('/users', async (req, reply) => {
  const { email, telegramToken, chatId } = req.body;
  const user = await prisma.user.create({ data: { email, telegramToken, chatId } });
  reply.send(user);
});

fastify.post('/rules', async (req, reply) => {
  const { userId, condition } = req.body;
  const rule = await prisma.rule.create({ data: { userId, condition } });
  reply.send(rule);
});

fastify.get('/rules', async (req, reply) => {
  const rules = await prisma.rule.findMany({ where: { userId: req.query.userId } });
  reply.send(rules);
});

fastify.post('/test-email', async (req, reply) => {
  const { email, password, host, port } = req.body;
  const Imap = require('imap');
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