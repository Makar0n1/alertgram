const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');

const kafka = new Kafka({ clientId: 'notification-processor', brokers: [process.env.KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'notification-group' });
const producer = kafka.producer();
const prisma = new PrismaClient();

async function start() {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: 'email_in' });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const email = JSON.parse(message.value);
      const rules = await prisma.rule.findMany({ where: { userId: email.userId } });
      const matched = rules.some((rule) => email.subject.includes(rule.condition));
      if (matched) {
        await producer.send({
          topic: 'notification',
          messages: [{ value: JSON.stringify(email) }],
        });
      }
    },
  });
}

start().catch(console.error);