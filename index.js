require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';
const DATA_FILE = path.join(__dirname, 'data', 'role-menu.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ guilds: {} }, null, 2));
  }
}

function loadData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    const fresh = { guilds: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fresh, null, 2));
    return fresh;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuildConfig(guildId) {
  const data = loadData();
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      title: 'Rol Seçimi',
      description: 'Aşağıdaki rollerden birini seçerek üyeliğinizi güncelleyin.',
      adminRoleIds: [],
      roles: [],
      menuChannelId: null,
      messageId: null,
    };
    saveData(data);
  }
  return data.guilds[guildId];
}

function isAdmin(member, guild) {
  if (!member) return false;
  if (guild.ownerId === member.id) return true;
  if (member.permissions && member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;

  const config = getGuildConfig(guild.id);
  return config.adminRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

function buildRoleMenu(guildId) {
  const guild = client.guilds.cache.get(guildId);
  const config = getGuildConfig(guildId);

  const options = config.roles.slice(0, 25).map((entry) => {
    const role = guild?.roles.cache.get(entry.roleId);
    return new StringSelectMenuOptionBuilder()
      .setLabel(role ? role.name : 'Bilinmeyen rol')
      .setValue(entry.roleId)
      .setDescription(entry.description || 'Rol al / bırak')
      .setEmoji(entry.emoji || '🎭');
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('role-menu-select')
    .setPlaceholder(options.length ? 'Rol seçin...' : 'Rol eklenmedi')
    .setMinValues(0)
    .setMaxValues(1)
    .addOptions(options.length ? options : [
      new StringSelectMenuOptionBuilder()
        .setLabel('Rol eklenmedi')
        .setValue('empty-role')
        .setDescription('Yönetici rolü ile ekleyebilirsiniz.')
        .setEmoji('⚠️')
    ]);

  return new ActionRowBuilder().addComponents(menu);
}

function buildAdminButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('role-admin-title').setLabel('Başlık').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('role-admin-description').setLabel('Açıklama').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('role-admin-add-role').setLabel('Rol Ekle').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('role-admin-remove-role').setLabel('Rol Kaldır').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('role-admin-add-admin').setLabel('Admin Ekle').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('role-admin-remove-admin').setLabel('Admin Sil').setStyle(ButtonStyle.Danger)
  );
}

function buildEmbed(guildId) {
  const config = getGuildConfig(guildId);
  return new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(config.title)
    .setDescription(config.description)
    .setFooter({ text: 'Rol menüsü - !help' });
}

async function refreshRoleMenu(guildId) {
  const guild = client.guilds.cache.get(guildId);
  const config = getGuildConfig(guildId);
  if (!guild || !config.menuChannelId) return;

  const channel = guild.channels.cache.get(config.menuChannelId);
  if (!channel || !channel.isTextBased()) return;

  const message = config.messageId ? await channel.messages.fetch(config.messageId).catch(() => null) : null;
  const payload = {
    embeds: [buildEmbed(guildId)],
    components: [buildRoleMenu(guildId), buildAdminButtons()],
  };

  if (message) {
    await message.edit(payload);
    return;
  }

  const sent = await channel.send(payload);
  config.messageId = sent.id;
  config.menuChannelId = channel.id;
  const data = loadData();
  data.guilds[guildId] = config;
  saveData(data);
}

function getRoleFromInput(guild, input) {
  if (!input) return null;
  const cleaned = input.replace(/[<@&>]/g, '').trim();
  return guild.roles.cache.get(cleaned) || guild.roles.cache.find((r) => r.name.toLowerCase() === cleaned.toLowerCase().replace(/^@/, '')) || null;
}

async function handlePrefixCommand(message) {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  if (!isAdmin(message.member, message.guild)) {
    await message.reply('Bu komutu kullanmak için yetkili rolüne sahip olman gerekiyor.');
    return;
  }

  if (command === 'help' || command === 'yardim') {
    await message.reply('Komutlar:\n!rolmenu-ayarla #kanal\n!rol-ekle @Rol 🎉 Açıklama\n!rol-sil @Rol\n!rolmenu-yenile\n!admin-rol-ekle @Yönetici\n!admin-rol-kaldir @Yönetici');
    return;
  }

  if (command === 'rolmenu-ayarla') {
    const channelName = args[0];
    const channel = message.guild.channels.cache.find((c) => c.type === ChannelType.GuildText && (c.id === channelName?.replace(/[<#>]/g, '') || c.name === channelName?.replace(/^#/, '')));

    if (!channel) {
      await message.reply('Geçerli bir kanal belirtmelisin. Örn: `!rolmenu-ayarla #rol-menusu`');
      return;
    }

    const data = loadData();
    const config = data.guilds[message.guild.id] || getGuildConfig(message.guild.id);
    config.menuChannelId = channel.id;
    config.messageId = null;
    data.guilds[message.guild.id] = config;
    saveData(data);

    const sent = await channel.send({ embeds: [buildEmbed(message.guild.id)], components: [buildRoleMenu(message.guild.id), buildAdminButtons()] });
    const updated = loadData();
    updated.guilds[message.guild.id].messageId = sent.id;
    updated.guilds[message.guild.id].menuChannelId = channel.id;
    saveData(updated);

    await message.reply(`Rol menüsü ${channel} kanalına sabitlendi.`);
    return;
  }

  if (command === 'rol-ekle') {
    const role = getRoleFromInput(message.guild, args[0]);
    const emoji = args[1] || '🎭';
    const description = args.slice(2).join(' ') || 'Rol seçimi';

    if (!role) {
      await message.reply('Rol bulunamadı. Örn: `!rol-ekle @Etkinlik 🎉 Etkinlik rolü`');
      return;
    }

    const data = loadData();
    const config = data.guilds[message.guild.id] || getGuildConfig(message.guild.id);
    config.roles = config.roles.filter((entry) => entry.roleId !== role.id);
    config.roles.push({ roleId: role.id, emoji, description });
    data.guilds[message.guild.id] = config;
    saveData(data);

    await refreshRoleMenu(message.guild.id);
    await message.reply(`\`${role.name}\` rolü menüye eklendi.`);
    return;
  }

  if (command === 'rol-sil') {
    const role = getRoleFromInput(message.guild, args[0]);
    if (!role) {
      await message.reply('Kaldırılacak rol bulunamadı.');
      return;
    }

    const data = loadData();
    const config = data.guilds[message.guild.id] || getGuildConfig(message.guild.id);
    config.roles = config.roles.filter((entry) => entry.roleId !== role.id);
    data.guilds[message.guild.id] = config;
    saveData(data);

    await refreshRoleMenu(message.guild.id);
    await message.reply(`\`${role.name}\` rolü menüden kaldırıldı.`);
    return;
  }

  if (command === 'rolmenu-yenile') {
    await refreshRoleMenu(message.guild.id);
    await message.reply('Rol menüsü güncellendi.');
    return;
  }

  if (command === 'admin-rol-ekle') {
    const role = getRoleFromInput(message.guild, args[0]);
    if (!role) {
      await message.reply('Admin rolü bulunamadı.');
      return;
    }

    const data = loadData();
    const config = data.guilds[message.guild.id] || getGuildConfig(message.guild.id);
    config.adminRoleIds = [...new Set([...config.adminRoleIds, role.id])];
    data.guilds[message.guild.id] = config;
    saveData(data);

    await message.reply(`Admin rol eklendi: <@&${role.id}>`);
    return;
  }

  if (command === 'admin-rol-kaldir') {
    const role = getRoleFromInput(message.guild, args[0]);
    if (!role) {
      await message.reply('Kaldırılacak admin rolü bulunamadı.');
      return;
    }

    const data = loadData();
    const config = data.guilds[message.guild.id] || getGuildConfig(message.guild.id);
    config.adminRoleIds = config.adminRoleIds.filter((id) => id !== role.id);
    data.guilds[message.guild.id] = config;
    saveData(data);

    await message.reply(`Admin rol kaldırıldı: <@&${role.id}>`);
    return;
  }

  await message.reply('Bilinmeyen komut. `!help` yazıp komut listesini gör.');
}

client.on(Events.MessageCreate, handlePrefixCommand);

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.guild) return;

  if (interaction.isButton()) {
    if (!isAdmin(interaction.member, interaction.guild)) {
      await interaction.reply({ content: 'Bu işlemi yapmak için yetkili olmanız gerekiyor.', ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-admin-title') {
      const modal = new ModalBuilder().setCustomId('role-modal-title').setTitle('Menü Başlığı');
      const input = new TextInputBuilder().setCustomId('title').setLabel('Yeni başlık').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'role-admin-description') {
      const modal = new ModalBuilder().setCustomId('role-modal-description').setTitle('Menü Açıklaması');
      const input = new TextInputBuilder().setCustomId('description').setLabel('Yeni açıklama').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'role-admin-add-role') {
      const modal = new ModalBuilder().setCustomId('role-modal-add-role').setTitle('Rol Ekle');
      const roleInput = new TextInputBuilder().setCustomId('roleId').setLabel('Rol ID veya ad').setStyle(TextInputStyle.Short).setRequired(true);
      const emojiInput = new TextInputBuilder().setCustomId('emoji').setLabel('Emoji').setStyle(TextInputStyle.Short).setRequired(true);
      const descInput = new TextInputBuilder().setCustomId('description').setLabel('Açıklama').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(roleInput), new ActionRowBuilder().addComponents(emojiInput), new ActionRowBuilder().addComponents(descInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'role-admin-remove-role') {
      const modal = new ModalBuilder().setCustomId('role-modal-remove-role').setTitle('Rol Kaldır');
      const roleInput = new TextInputBuilder().setCustomId('roleId').setLabel('Rol ID veya ad').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(roleInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'role-admin-add-admin') {
      const modal = new ModalBuilder().setCustomId('role-modal-add-admin').setTitle('Admin Rol Ekle');
      const roleInput = new TextInputBuilder().setCustomId('roleId').setLabel('Admin rol ID veya ad').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(roleInput));
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'role-admin-remove-admin') {
      const modal = new ModalBuilder().setCustomId('role-modal-remove-admin').setTitle('Admin Rol Sil');
      const roleInput = new TextInputBuilder().setCustomId('roleId').setLabel('Admin rol ID veya ad').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(roleInput));
      await interaction.showModal(modal);
      return;
    }
  }

  if (interaction.isModalSubmit()) {
    if (!isAdmin(interaction.member, interaction.guild)) {
      await interaction.reply({ content: 'Bu işlemi yapmak için yetkili olmanız gerekiyor.', ephemeral: true });
      return;
    }

    const guildId = interaction.guild.id;
    const data = loadData();
    const config = data.guilds[guildId] || getGuildConfig(guildId);

    if (interaction.customId === 'role-modal-title') {
      config.title = interaction.fields.getTextInputValue('title');
      data.guilds[guildId] = config;
      saveData(data);
      await refreshRoleMenu(guildId);
      await interaction.reply({ content: 'Menü başlığı güncellendi.', ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-modal-description') {
      config.description = interaction.fields.getTextInputValue('description');
      data.guilds[guildId] = config;
      saveData(data);
      await refreshRoleMenu(guildId);
      await interaction.reply({ content: 'Menü açıklaması güncellendi.', ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-modal-add-role') {
      const role = getRoleFromInput(interaction.guild, interaction.fields.getTextInputValue('roleId'));
      const emoji = interaction.fields.getTextInputValue('emoji');
      const description = interaction.fields.getTextInputValue('description');
      if (!role) {
        await interaction.reply({ content: 'Rol bulunamadı.', ephemeral: true });
        return;
      }
      config.roles = config.roles.filter((entry) => entry.roleId !== role.id);
      config.roles.push({ roleId: role.id, emoji, description });
      data.guilds[guildId] = config;
      saveData(data);
      await refreshRoleMenu(guildId);
      await interaction.reply({ content: `\`${role.name}\` rolü menüye eklendi.`, ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-modal-remove-role') {
      const role = getRoleFromInput(interaction.guild, interaction.fields.getTextInputValue('roleId'));
      if (!role) {
        await interaction.reply({ content: 'Rol bulunamadı.', ephemeral: true });
        return;
      }
      config.roles = config.roles.filter((entry) => entry.roleId !== role.id);
      data.guilds[guildId] = config;
      saveData(data);
      await refreshRoleMenu(guildId);
      await interaction.reply({ content: `\`${role.name}\` rolü menüden kaldırıldı.`, ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-modal-add-admin') {
      const role = getRoleFromInput(interaction.guild, interaction.fields.getTextInputValue('roleId'));
      if (!role) {
        await interaction.reply({ content: 'Admin rolü bulunamadı.', ephemeral: true });
        return;
      }
      config.adminRoleIds = [...new Set([...config.adminRoleIds, role.id])];
      data.guilds[guildId] = config;
      saveData(data);
      await interaction.reply({ content: `Admin rol eklendi: <@&${role.id}>`, ephemeral: true });
      return;
    }

    if (interaction.customId === 'role-modal-remove-admin') {
      const role = getRoleFromInput(interaction.guild, interaction.fields.getTextInputValue('roleId'));
      if (!role) {
        await interaction.reply({ content: 'Admin rolü bulunamadı.', ephemeral: true });
        return;
      }
      config.adminRoleIds = config.adminRoleIds.filter((id) => id !== role.id);
      data.guilds[guildId] = config;
      saveData(data);
      await interaction.reply({ content: `Admin rol kaldırıldı: <@&${role.id}>`, ephemeral: true });
      return;
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'role-menu-select') {
    if (interaction.values.includes('empty-role')) {
      await interaction.reply({ content: 'Bu menüde aktif bir rol yok.', ephemeral: true });
      return;
    }

    const config = getGuildConfig(interaction.guild.id);
    const member = interaction.member;
    const selected = interaction.values.filter((value) => config.roles.some((entry) => entry.roleId === value));

    if (!selected.length) {
      await interaction.reply({ content: 'Geçersiz rol seçimi.', ephemeral: true });
      return;
    }

    const updates = [];
    for (const roleId of selected) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(role).catch(() => {});
        updates.push(`Rol kaldırıldı: ${role.name}`);
      } else {
        await member.roles.add(role).catch(() => {});
        updates.push(`Rol verildi: ${role.name}`);
      }
    }

    await interaction.reply({ content: updates.join(' | ') || 'İşlem gerçekleşmedi.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
