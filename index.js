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

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;

  const content = message.content.toLowerCase();
  const channelId = process.env.CHANNEL_ID;
  const guildId = process.env.GUILD_ID;

  // !join: يدخل روم من .env
  if (content === '!join') {
    const connection = getVoiceConnection(guildId);
    if (connection && connection.state.status !== VoiceConnectionStatus.Disconnected) {
      message.channel.send('❌ البوت داخل الروم فعليًا!');
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        message.channel.send('❌ لم يتم العثور على الروم.');
        return;
      }

      joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        selfMute: true,
        selfDeaf: true,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

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
        selfDeaf: true,
        adapterCreator: foundChannel.guild.voiceAdapterCreator,
      });

      message.channel.send(`✅ أنت الآن في وضع AFK في الروم: ${foundChannel.name}`);
      console.log(`✅ دخل الروم: ${foundChannel.name}`);
    } catch (err) {
      console.error('❌ خطأ في أمر AFK:', err.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تنفيذ أمر AFK.');
    }
  }

  // !leave: يخرج من الروم
  if (content === '!leave') {
    const connection = getVoiceConnection(guildId);
    if (!connection) {
      message.channel.send('❌ البوت غير متصل بالروم.');
      return;
    }

    try {
      connection.destroy();
      message.channel.send('✅ تم الخروج من الروم');
      console.log('✅ تم الخروج من الروم');
    } catch (error) {
      console.error('خطأ في الخروج من الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الخروج.');
    }
  }
});

client.login(process.env.TOKEN);
