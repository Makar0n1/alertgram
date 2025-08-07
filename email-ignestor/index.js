const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'email-ingestor', brokers: [process.env.KAFKA_BROKER] });
const producer = kafka.producer();

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  host: process.env.IMAP_HOST,
  port: parseInt(process.env.IMAP_PORT),
  tls: true,
};

const imap = new Imap(imapConfig);

async function start() {
  await producer.connect();
  imap.once('ready', () => {
    imap.openBox('INBOX', false, (err) => {
      if (err) throw err;
      imap.on('mail', () => {
        imap.search(['UNSEEN'], (err, results) => {
          if (err) throw err;
          if (!results.length) return;
          const f = imap.fetch(results, { bodies: '', markSeen: true });
          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, mail) => {
                if (err) throw err;
                const event = {
                  userId: 'user-123', // Replace with actual user lookup
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
  imap.on('error', (err) => console.error(err));
  imap.connect();
}

start().catch(console.error);