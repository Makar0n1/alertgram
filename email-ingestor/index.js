const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const fastify = require('fastify')({ logger: true });

const kafka = new Kafka({ clientId: 'email-ingestor', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'email-ingestor-group' });
const prisma = new PrismaClient();
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
let imapConnections = [];

async function refreshAccessToken(project) {
  if (!project.refreshToken) return null;
  oauth2Client.setCredentials({ refresh_token: project.refreshToken });
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await prisma.project.update({
      where: { id: project.id },
      data: {
        accessToken: credentials.access_token,
        tokenExpiry: new Date(Date.now() + credentials.expiry_date),
      },
    });
    return credentials.access_token;
  } catch (err) {
    console.error(`Ошибка обновления токена для ${project.email}:`, err);
    return null;
  }
}

async function startImapConnections() {
  imapConnections.forEach(imap => imap.end());
  imapConnections = [];

  const projects = await prisma.project.findMany({
    select: { id: true, userId: true, email: true, pasword: true, host: true, port: true, accessToken: true, refreshToken: true, tokenExpiry: true },
  });

  for (const project of projects) {
    if (!project.email || (!project.password && !project.accessToken)) continue;

    let imapConfig;
    if (project.accessToken) {
      let accessToken = project.accessToken;
      if (project.tokenExpiry && new Date(project.tokenExpiry) <= new Date()) {
        accessToken = await refreshAccessToken(project);
      }
      if (!accessToken) continue;
      imapConfig = {
        user: project.email,
        xoauth2: Buffer.from(`user=${project.email}\x01auth=Bearer ${accessToken}\x01\x01`).toString('base64'),
        host: project.host || 'imap.gmail.com',
        port: project.port || 993,
        tls: true,
      };
    } else {
      imapConfig = {
        user: project.email,
        password: project.password,
        host: project.host,
        port: project.port,
        tls: true,
      };
    }

    const imap = new Imap(imapConfig);
    imapConnections.push(imap);

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          console.error(`Ошибка открытия INBOX для ${project.email}:`, err);
          return;
        }
        imap.on('mail', () => {
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              console.error(`Ошибка поиска писем для ${project.email}:`, err);
              return;
            }
            if (!results.length) return;
            const f = imap.fetch(results, { bodies: '', markSeen: true });
            f.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, async (err, mail) => {
                  if (err) {
                    console.error(`Ошибка парсинга письма для ${project.email}:`, err);
                    return;
                  }
                  const event = {
                    userId: project.userId,
                    projectId: project.id,
                    from: mail.from.text,
                    subject: mail.subject || '',
                    text: mail.text || '',
                    timestamp: new Date().toISOString(),
                  };
                  await producer.send({
                    topic: 'email_in',
                    messages: [{ value: JSON.stringify(event) }],
                  });
                });
              });
            });
          });
        });
      });
    });

    imap.on('error', (err) => console.error(`IMAP ошибка для ${project.email}:`, err));
    imap.connect();
  }
}

async function start() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'reload_email_ingestor' });

  await consumer.run({
    eachMessage: async () => {
      await startImapConnections();
    },
  });

  await startImapConnections();

  fastify.post('/reload', async (req, reply) => {
    await startImapConnections();
    reply.send({ success: true });
  });

  fastify.listen({ port: 3002, host: '0.0.0.0' }, (err) => {
    if (err) throw err;
  });
}

start().catch(console.error);