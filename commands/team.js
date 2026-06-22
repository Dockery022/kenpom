const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');

const path = require('path');

const { getTeamStats, getConferences, getTeams } = require('../services/kenpomService');
const { getBranding } = require('../services/teamBranding');

function fmt(val, decimals = 1) {
  if (val == null || isNaN(val)) return 'N/A';
  return Number(val).toFixed(decimals);
}

function fmtPct(val, decimals = 1) {
  if (val == null || isNaN(val)) return 'N/A';
  return Number(val).toFixed(decimals) + '%';
}

function rk(val) {
  if (val == null || isNaN(val)) return '';
  return ' (' + Math.round(Number(val)) + ')';
}

function offDef(offVal, offRank, defVal, defRank, decimals = 1) {
  return `${fmt(offVal, decimals)}${rk(offRank)}  /  ${fmt(defVal, decimals)}${rk(defRank)}`;
}

function offDefPct(offVal, offRank, defVal, defRank, decimals = 1) {
  return `${fmtPct(offVal, decimals)}${rk(offRank)}  /  ${fmtPct(defVal, decimals)}${rk(defRank)}`;
}

function single(val, rank, decimals = 1) {
  return `${fmt(val, decimals)}${rk(rank)}`;
}

function singlePct(val, rank, decimals = 1) {
  return `${fmtPct(val, decimals)}${rk(rank)}`;
}

const CATEGORIES = [
  { id: 'efficiency', label: 'Efficiency', emoji: '\uD83D\uDCCA' },
  { id: 'four_factors', label: 'Four Factors', emoji: '\uD83D\uDCCB' },
  { id: 'misc', label: 'Misc', emoji: '\uD83D\uDD0D' },
  { id: 'style', label: 'Style', emoji: '\uD83C\uDFA8' },
  { id: 'points', label: 'Points', emoji: '\uD83C\uDFC0' },
  { id: 'sos', label: 'SOS', emoji: '\uD83D\uDCAA' },
  { id: 'personnel', label: 'Personnel', emoji: '\uD83D\uDC65' }
];

function buildEmbed(stats, branding, categoryId) {
  const embed = new EmbedBuilder()
    .setColor(branding.color ? parseInt(branding.color.replace('#',''), 16) : 0x888888)
    .setTitle(`${stats.team} \u2014 ${stats.season}`);

  const cat = CATEGORIES.find(c => c.id === categoryId);
  embed.setDescription(`${cat.emoji} **${cat.label}**`);

  switch (categoryId) {
    case 'efficiency':
      embed.addFields(
        {
          name: 'Adj. Efficiency (Off / Def)',
          value:
            `**AdjEff:** ${offDef(stats.adjO, stats.adjO_rk, stats.adjD, stats.adjD_rk)}\n` +
            `**Tempo:** ${single(stats.tempo, stats.tempo_rk)}\n` +
            `**Poss Len:** ${offDef(stats.avg_poss_off, stats.avg_poss_off_rk, stats.avg_poss_def, stats.avg_poss_def_rk)}`,
          inline: false
        }
      );
      break;
    case 'four_factors':
      embed.addFields(
        {
          name: 'Four Factors (Off / Def)',
          value:
            `**eFG%:** ${offDefPct(stats.efg_off, stats.efg_off_rk, stats.efg_def, stats.efg_def_rk)}\n` +
            `**TO%:** ${offDefPct(stats.to_off, stats.to_off_rk, stats.to_def, stats.to_def_rk)}\n` +
            `**OR%:** ${offDefPct(stats.orb_off, stats.orb_off_rk, stats.orb_def, stats.orb_def_rk)}\n` +
            `**FTA/FGA:** ${offDefPct(stats.ft_off, stats.ft_off_rk, stats.ft_def, stats.ft_def_rk)}`,
          inline: false
        }
      );
      break;
    case 'misc':
      embed.addFields(
        {
          name: 'Miscellaneous Components (Off / Def)',
          value:
            `**3P%:** ${offDefPct(stats.three_off, stats.three_off_rk, stats.three_def, stats.three_def_rk)}\n` +
            `**2P%:** ${offDefPct(stats.two_off, stats.two_off_rk, stats.two_def, stats.two_def_rk)}\n` +
            `**FT%:** ${offDefPct(stats.ft_pct, stats.ft_pct_rk, stats.ft_def_pct, stats.ft_def_pct_rk)}\n` +
            `**Block%:** ${offDefPct(stats.blk_off, stats.blk_off_rk, stats.blk_def, stats.blk_def_rk)}\n` +
            `**Steal%:** ${offDefPct(stats.stl_off, stats.stl_off_rk, stats.stl_def, stats.stl_def_rk)}\n` +
            `**NSTO%:** ${offDefPct(stats.nst_off, stats.nst_off_rk, stats.nst_def, stats.nst_def_rk)}\n` +
            `**2PA Dist:** ${offDef(stats.avg2pt_off, stats.avg2pt_off_rk, stats.avg2pt_def, stats.avg2pt_def_rk)}`,
          inline: false
        }
      );
      break;
    case 'style':
      embed.addFields(
        {
          name: 'Style Components (Off / Def)',
          value:
            `**3PA/FGA:** ${offDefPct(stats.three_rate_off, stats.three_rate_off_rk, stats.three_rate_def, stats.three_rate_def_rk)}\n` +
            `**A/FGM:** ${offDefPct(stats.ast_rate_off, stats.ast_rate_off_rk, stats.ast_rate_def, stats.ast_rate_def_rk)}`,
          inline: false
        }
      );
      break;
    case 'points':
      embed.addFields(
        {
          name: 'Point Distribution % (Off / Def)',
          value:
            `**3-Pointers:** ${offDefPct(stats.pt3_off, stats.pt3_off_rk, stats.pt3_def, stats.pt3_def_rk)}\n` +
            `**2-Pointers:** ${offDefPct(stats.pt2_off, stats.pt2_off_rk, stats.pt2_def, stats.pt2_def_rk)}\n` +
            `**Free Throws:** ${offDefPct(stats.ft_dist_off, stats.ft_dist_off_rk, stats.ft_dist_def, stats.ft_dist_def_rk)}`,
          inline: false
        }
      );
      break;
    case 'sos':
      embed.addFields(
        {
          name: 'Strength of Schedule',
          value:
            `**Components:** ${offDef(stats.sos_off, stats.sos_off_rk, stats.sos_def, stats.sos_def_rk)}\n` +
            `**Overall:** ${single(stats.sos, stats.sos_rk)}\n` +
            `**Non-Conf:** ${single(stats.sos_nc, stats.sos_nc_rk)}`,
          inline: false
        }
      );
      break;
    case 'personnel':
      embed.addFields(
        {
          name: 'Personnel',
          value:
            `**Bench Min:** ${singlePct(stats.bench_minutes, stats.bench_rk)}\n` +
            `**Experience:** ${single(stats.experience, stats.exp_rk, 2)} yrs\n` +
            `**Continuity:** ${singlePct(stats.continuity, stats.cont_rk)}\n` +
            `**Avg Height:** ${single(stats.height, stats.height_rk)}"`,
          inline: false
        }
      );
      break;
  }

  return embed;
}

function buildButtons(activeId) {
  const rows = [];
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  CATEGORIES.forEach((cat, i) => {
    const btn = new ButtonBuilder()
      .setCustomId(`team_${cat.id}`)
      .setLabel(cat.label)
      .setEmoji(cat.emoji)
      .setStyle(cat.id === activeId ? ButtonStyle.Primary : ButtonStyle.Secondary);
    if (i < 4) row1.addComponents(btn);
    else row2.addComponents(btn);
  });

  rows.push(row1);
  if (row2.components.length > 0) rows.push(row2);
  return rows;
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Get KenPom analytics for a team')
    .addIntegerOption(option =>
      option
        .setName('season')
        .setDescription('Season year (2010-2026)')
        .setRequired(true)
        .addChoices(
          ...Array.from({ length: 17 }, (_, i) => ({
            name: (2026 - i).toString(),
            value: 2026 - i
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName('conference')
        .setDescription('Conference')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('team')
        .setDescription('Team name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const season = interaction.options.getInteger('season') || new Date().getFullYear();

    try {
      if (focusedOption.name === 'conference') {
        const conferences = getConferences(season);
        const filtered = conferences
          .filter(c => c.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(filtered.map(c => ({ name: c, value: c })));
      } else if (focusedOption.name === 'team') {
        const conference = interaction.options.getString('conference');
        const teams = getTeams(season, conference);
        const filtered = teams
          .filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(filtered.map(t => ({ name: t, value: t })));
      }
    } catch (error) {
      console.error('Autocomplete Error:', error);
      if (!interaction.responded) await interaction.respond([]);
    }
  },

  async execute(interaction) {

    await interaction.deferReply();

    try {

      const teamName = interaction.options.getString('team');
      const season = interaction.options.getInteger('season');

      const stats = await getTeamStats(teamName, season);

      if (!stats) {
        return interaction.editReply('Team not found.');
      }

      const branding = getBranding(stats.team);

      let logoFile = null;
      if (branding.logo) {
        const logoPath = path.join(__dirname, '..', 'assets', 'logos', branding.logo);
        logoFile = new AttachmentBuilder(logoPath);
      }

      const defaultCategory = 'efficiency';
      const embed = buildEmbed(stats, branding, defaultCategory);
      if (branding.logo) embed.setThumbnail(`attachment://${branding.logo}`);

      const buttons = buildButtons(defaultCategory);

      const msgPayload = { embeds: [embed], components: buttons };
      if (logoFile) msgPayload.files = [logoFile];

      const reply = await interaction.editReply(msgPayload);

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000
      });

      collector.on('collect', async (btnInteraction) => {
        const categoryId = btnInteraction.customId.replace('team_', '');
        const newEmbed = buildEmbed(stats, branding, categoryId);
        if (branding.logo) newEmbed.setThumbnail(`attachment://${branding.logo}`);
        const newButtons = buildButtons(categoryId);

        await btnInteraction.update({ embeds: [newEmbed], components: newButtons });
      });

      collector.on('end', async () => {
        try {
          const disabledButtons = buildButtons('').map(row => {
            row.components.forEach(btn => btn.setDisabled(true));
            return row;
          });
          await reply.edit({ components: disabledButtons });
        } catch (e) {}
      });

    } catch (error) {

      console.error('TEAM COMMAND ERROR:', error);

      await interaction.editReply('Error executing command.');

    }

  }

};
