require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});

const client = new Client();

let autoCheckEnabled = false;
let autoCheckInterval = null;
let lastVoiceChannelId = null;
let lastGuildId = null;

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;

  const content = message.content.toLowerCase();

  // !join: يدخل روم من .env
  if (content === '!join') {
    try {
      const channel = await client.channels.fetch(process.env.CHANNEL_ID);
      if (!channel) return message.channel.send('❌ لم يتم العثور على الروم.');

      joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        selfMute: true,
        selfDeaf: false,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      lastVoiceChannelId = channel.id;
      lastGuildId = channel.guild.id;

      message.channel.send('✅ تم دخول الروم بنجاح');
      console.log('✅ تم دخول الروم');
    } catch (error) {
      console.error('خطأ في دخول الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الدخول.');
    }
  }

  // !afk: يدخل نفس الروم اللي أنت فيه
  if (content === '!afk') {
    try {
      let foundChannel = null;
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          foundChannel = me.voice.channel;
        }
      });

      if (!foundChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      joinVoiceChannel({
        channelId: foundChannel.id,
        guildId: foundChannel.guild.id,
        selfMute: true,
        selfDeaf: false,
        adapterCreator: foundChannel.guild.voiceAdapterCreator,
      });

      lastVoiceChannelId = foundChannel.id;
      lastGuildId = foundChannel.guild.id;

      message.channel.send(`✅ أنت الآن في وضع AFK في الروم: ${foundChannel.name}`);
      console.log(`✅ دخل الروم: ${foundChannel.name}`);
    } catch (err) {
      console.error('❌ خطأ في أمر AFK:', err.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تنفيذ أمر AFK.');
    }
  }

  // !leave
  if (content === '!leave') {
    const connection = getVoiceConnection(lastGuildId);
    if (!connection) return message.channel.send('❌ البوت غير متصل بالروم.');

    try {
      connection.destroy();
      message.channel.send('✅ تم الخروج من الروم');
      console.log('✅ تم الخروج من الروم');
    } catch (error) {
      console.error('خطأ في الخروج من الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الخروج.');
    }
  }

  // !stay
  if (content === '!stay') {
    if (autoCheckEnabled) {
      message.channel.send('🔁 الفحص شغال بالفعل.');
      return;
    }

    if (!lastVoiceChannelId || !lastGuildId) {
      message.channel.send('❌ لم يتم حفظ آخر روم صوتي.');
      return;
    }

    autoCheckEnabled = true;
    message.channel.send('✅ تم تفعيل وضع الحماية من الطرد.');

    autoCheckInterval = setInterval(async () => {
      try {
        const guild = await client.guilds.fetch(lastGuildId);
        const me = await guild.members.fetch(client.user.id);

        if (!me.voice.channel) {
          console.log('🚨 تم الطرد. إعادة الدخول...');
          const channel = await client.channels.fetch(lastVoiceChannelId);
          joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            selfMute: true,
            selfDeaf: false,
            adapterCreator: channel.guild.voiceAdapterCreator,
          });
          console.log('✅ عاد إلى الروم.');
        } else {
          console.log('✅ لا يزال داخل الروم.');
        }
      } catch (err) {
        console.error('❌ خطأ أثناء الفحص:', err.message);
      }
    }, 1000 * 60 * 60); // كل ساعة
  }

  // !stopstay
  if (content === '!stopstay') {
    if (!autoCheckEnabled) return message.channel.send('❌ الفحص غير مفعل.');

    clearInterval(autoCheckInterval);
    autoCheckEnabled = false;
    autoCheckInterval = null;
    message.channel.send('🛑 تم إيقاف الفحص التلقائي.');
  }
});

client.login(process.env.TOKEN);
