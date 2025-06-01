require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Express server running on port ${port}`));

const client = new Client();
let autoCheckEnabled = false;
let autoCheckInterval = null;
let latestVoiceChannelId = null;
let latestGuildId = null;

client.on('ready', () => {
  console.log(`${client.user.username} is ready!`);
});

// تحديث آخر روم يتم الدخول له (حتى لو سحبوك له)
client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.member.id === client.user.id && newState.channelId) {
    latestVoiceChannelId = newState.channelId;
    latestGuildId = newState.guild.id;
    console.log(`🎧 تم تحديث آخر روم إلى: ${newState.channel?.name}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;
  const content = message.content.toLowerCase();

  // !stay: يبدأ الفحص كل 3 دقائق
  if (content === '!stay') {
    if (autoCheckEnabled) return message.channel.send('🔁 الفحص شغال بالفعل.');
    if (!latestVoiceChannelId || !latestGuildId) return message.channel.send('❌ لم يتم حفظ أي روم صوتي بعد.');

    autoCheckEnabled = true;
    message.channel.send('✅ تم تفعيل الحماية من الخروج من الروم.');

    autoCheckInterval = setInterval(async () => {
      try {
        const guild = await client.guilds.fetch(latestGuildId);
        const me = await guild.members.fetch(client.user.id);

        if (!me.voice.channel) {
          console.log('🚨 تم الخروج من الروم.. جاري الرجوع.');
          const channel = await client.channels.fetch(latestVoiceChannelId);
          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            selfMute: true,
            selfDeaf: false,
            adapterCreator: channel.guild.voiceAdapterCreator,
          });
          console.log(`✅ عاد إلى الروم: ${channel.name}`);
        } else {
          console.log(`✅ لا يزال داخل الروم: ${me.voice.channel.name}`);
        }
      } catch (err) {
        console.error('❌ خطأ أثناء التحقق:', err.message);
      }
    }, 1000 * 60 * 3); // كل 3 دقائق
  }

  // !stopstay: يوقف الفحص التلقائي
  if (content === '!stopstay') {
    if (!autoCheckEnabled) return message.channel.send('❌ الفحص غير مفعل.');

    clearInterval(autoCheckInterval);
    autoCheckEnabled = false;
    autoCheckInterval = null;
    message.channel.send('🛑 تم إيقاف الفحص.');
  }

  // !leave: يطلع من الروم
  if (content === '!leave') {
    try {
      const guild = await client.guilds.fetch(latestGuildId);
      const me = await guild.members.fetch(client.user.id);
      if (!me.voice.channel) return message.channel.send('❌ غير متصل بأي روم.');
      me.voice.disconnect();
      message.channel.send('✅ تم الخروج من الروم.');
    } catch (err) {
      console.error('❌ خطأ أثناء الخروج:', err.message);
      message.channel.send('❌ حدث خطأ أثناء الخروج.');
    }
  }
});

client.login(process.env.TOKEN);
