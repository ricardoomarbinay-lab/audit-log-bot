require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  AuditLogEvent,
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration],
});

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const cut = (value, max = 1000) => {
  let text;
  if (value === undefined || value === null) text = '—';
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
};

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Conectado como ${c.user.tag}`);
});

client.on(Events.GuildAuditLogEntryCreate, async (entry, guild) => {
  try {
    const channel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const actionName = AuditLogEvent[entry.action] ?? `Desconocida (${entry.action})`;

    const embed = new EmbedBuilder()
      .setTitle(`📋 ${actionName}`)
      .setColor(0x5865f2)
      .addFields(
        {
          name: 'Ejecutor',
          value: entry.executorId ? `<@${entry.executorId}> (${entry.executorId})` : 'Desconocido',
          inline: true,
        },
        {
          name: 'Objetivo',
          value: entry.targetId ? `${entry.targetType ?? 'Objeto'} · ${entry.targetId}` : '—',
          inline: true,
        },
        { name: 'Motivo', value: cut(entry.reason ?? 'Sin motivo') }
      )
      .setFooter({ text: `ID del registro: ${entry.id}` })
      .setTimestamp(entry.createdAt);

    if (entry.changes?.length) {
      const changes = entry.changes
        .map((ch) => `**${ch.key}**: \`${cut(ch.old, 150)}\` → \`${cut(ch.new, 150)}\``)
        .join('\n');
      embed.addFields({ name: 'Cambios', value: cut(changes) });
    }

    if (entry.extra) {
      embed.addFields({ name: 'Extra', value: `\`\`\`json\n${cut(entry.extra, 900)}\n\`\`\`` });
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error al registrar entrada de auditoría:', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
