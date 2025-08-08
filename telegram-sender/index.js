const { Kafka } = require('kafkajs');
   const TelegramBot = require('node-telegram-bot-api');
   const { PrismaClient } = require('@prisma/client');

   const kafka = new Kafka({ clientId: 'telegram-sender', brokers: [process.env.KAFKA_BROKER] });
   const consumer = kafka.consumer({ groupId: 'telegram-group' });
   const prisma = new PrismaClient();
   const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

   async function start() {
     // Отправляем тестовое сообщение всем пользователям с chatId
     const users = await prisma.user.findMany({ select: { chatId: true } });
     for (const user of users) {
       if (user.chatId) {
         try {
           await bot.sendMessage(user.chatId, '✅ Чат успешно инициализирован для уведомлений!');
         } catch (err) {
           console.error(`Ошибка отправки тестового сообщения в chatId ${user.chatId}:`, err);
         }
       }
     }

     await consumer.connect();
     await consumer.subscribe({ topic: 'notification' });

     await consumer.run({
       eachMessage: async ({ message }) => {
         const email = JSON.parse(message.value);
         const user = await prisma.user.findUnique({ where: { id: email.userId } });
         if (user.chatId) {
           const text = `📩 Новое письмо!\nОт: ${email.from}\nТема: ${email.subject}\nТекст: ${email.text}`;
           await bot.sendMessage(user.chatId, text);
         }
       },
     });
   }

   start().catch(console.error);