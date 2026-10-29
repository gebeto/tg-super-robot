// handlers/message.js — runs on each `message` update. The file name is the
// Telegram update type; the platform calls the default export with the matching
// payload (here, a Message). The full update is available as `ctx.update`.

import { api } from 'sdk';

const replacePatterns = {
  "vt.tiktok.com": "kkclip.com",
  "www.instagram.com": "kkclip.com",
  "instagram.com": "kkclip.com",
  "www.reddit.com": "vxreddit.com",
  "reddit.com": "vxreddit.com",
};

export default async function (message, ctx) {
  if (message.text) {
    const foundKey = Object.keys(replacePatterns).find(p => message.text.includes(p));

    if (foundKey) {
      await api.sendMessage({
        chat_id: message.chat.id,
        text: message.text.replace(foundKey, replacePatterns[foundKey]),
        reply_parameters: {
          message_id: message.message_id,
        },
      });
    }

    if (message.text === 'test') {
      await api.sendMessage({
        chat_id: message.chat.id,
        text: JSON.stringify(message),
        reply_parameters: {
          message_id: message.message_id,
        },
      });
    }
  }
}
