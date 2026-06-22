const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');

const path = require('path');

const { getTeamStats, getConferences, getTeams } = require('../services/kenpomService');
const { getBranding } = require('../services/teamBranding');

function fmt(val, decimals = 1) {
  if (val == null || isNaN(val)) return 'N/A';
  return Number(val).toFixed(decimals);
}

function rk(val) {
  if (val == null || isNaN(val)) return '';
  return ' (' + Math.round(Number(val)) + ')';
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function closestCircle(hexColor) {
  if (!hexColor) return '\uD83D\uDFE2';
  const { r, g, b } = hexToRgb(hexColor);

  const circles = [
    { emoji: '\uD83D\uDD34', r: 221, g: 46, b: 68 },
    { emoji: '\uD83D\uDFE0', r: 245, g: 166, b: 35 },
    { emoji: '\uD83D\uDFE1', r: 253, g: 203, b: 88 },
    { emoji: '\uD83D\uDFE2', r: 120, g: 177, b: 89 },
    { emoji: '\uD83D\uDD35', r: 85, g: 172, b: 238 },
    { emoji: '\uD83D\uDFE3', r: 170, g: 142, b: 214 },
    { emoji: '\uD83D\uDFE4', r: 193, g: 105, b: 79 },
  ];

  let best = circles[0];
  let bestDist = Infinity;
  for (const c of circles) {
    const dist = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best.emoji;
}

function advantage(labelA, labelB, valA, valB, higher_is_better, emojiA, emojiB) {
  const a = Number(valA) || 0;
  const b = Number(valB) || 0;
  const diff = a - b;
  if (diff === 0) return '\u26AA Even';
  if (higher_is_better) {
    return diff > 0 ? `${emojiA} ${labelA}` : `${emojiB} ${labelB}`;
  }
  return diff < 0 ? `${emojiA} ${labelA}` : `${emojiB} ${labelB}`;
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName('matchup')
    .setDescription('Compare two teams using KenPom efficiency data')
    .addStringOption(option =>
      option
        .setName('conference_a')
        .setDescription('Conference for Team A')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('team_a')
        .setDescription('Team A')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('conference_b')
        .setDescription('Conference for Team B')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('team_b')
        .setDescription('Team B')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const season = new Date().getFullYear();

    try {
      if (focusedOption.name === 'conference_a' || focusedOption.name === 'conference_b') {
        const conferences = getConferences(season);
        const filtered = conferences
          .filter(c => c.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(filtered.map(c => ({ name: c, value: c })));
      } else if (focusedOption.name === 'team_a') {
        const conference = interaction.options.getString('conference_a');
        const teams = getTeams(season, conference);
        const filtered = teams
          .filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(filtered.map(t => ({ name: t, value: t })));
      } else if (focusedOption.name === 'team_b') {
        const conference = interaction.options.getString('conference_b');
        const teams = getTeams(season, conference);
        const filtered = teams
          .filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()))
          .slice(0, 25);
        await interaction.respond(filtered.map(t => ({ name: t, value: t })));
      }
    } catch (error) {
      console.error('Matchup Autocomplete Error:', error);
      if (!interaction.responded) await interaction.respond([]);
    }
  },

  async execute(interaction) {

    await interaction.deferReply();

    try {

      const teamAName = interaction.options.getString('team_a');
      const teamBName = interaction.options.getString('team_b');
      const season = new Date().getFullYear();

      const [statsA, statsB] = await Promise.all([
        getTeamStats(teamAName, season),
        getTeamStats(teamBName, season)
      ]);

      if (!statsA) return interaction.editReply(`Team not found: ${teamAName}`);
      if (!statsB) return interaction.editReply(`Team not found: ${teamBName}`);

      const brandA = getBranding(statsA.team);
      const brandB = getBranding(statsB.team);

      const files = [];
      let logoAName = null;
      let logoBName = null;

      if (brandA.logo) {
        const logoPath = path.join(__dirname, '..', 'assets', 'logos', brandA.logo);
        files.push(new AttachmentBuilder(logoPath));
        logoAName = brandA.logo;
      }
      if (brandB.logo) {
        const logoPath = path.join(__dirname, '..', 'assets', 'logos', brandB.logo);
        files.push(new AttachmentBuilder(logoPath));
        logoBName = brandB.logo;
      }

      const emA = Number(statsA.adjEM) || 0;
      const emB = Number(statsB.adjEM) || 0;
      const predictedSpread = ((emA - emB) / 1).toFixed(1);
      const favored = emA > emB ? statsA.team : statsB.team;
      const favoredBrand = emA > emB ? brandA : brandB;
      const favoredLogo = emA > emB ? logoAName : logoBName;
      const underdogLogo = emA > emB ? logoBName : logoAName;

      const embed = new EmbedBuilder()
        .setColor(favoredBrand.color ? parseInt(favoredBrand.color.replace('#',''), 16) : 0x888888)
        .setTitle(`${statsA.team} vs ${statsB.team} \u2014 ${season}`)
        .setDescription('\u{1F4CA} **Efficiency Matchup**');

      if (underdogLogo) embed.setThumbnail(`attachment://${underdogLogo}`);
      if (favoredLogo) embed.setImage(`attachment://${favoredLogo}`);
      const spreadDisplay = Math.abs(predictedSpread);

      embed.addFields(
        {
          name: '\uD83C\uDFC6 Predicted Spread',
          value: `**${favored}** by **${spreadDisplay}** points`,
          inline: false
        },
        {
          name: `\u{1F4C8} ${statsA.team}`,
          value:
            `**AdjEM:** ${fmt(statsA.adjEM)}${rk(statsA.adjEM_rk)}\n` +
            `**AdjO:** ${fmt(statsA.adjO)}${rk(statsA.adjO_rk)}\n` +
            `**AdjD:** ${fmt(statsA.adjD)}${rk(statsA.adjD_rk)}\n` +
            `**Tempo:** ${fmt(statsA.tempo)}${rk(statsA.tempo_rk)}`,
          inline: true
        },
        {
          name: `\uD83D\uDCC9 ${statsB.team}`,
          value:
            `**AdjEM:** ${fmt(statsB.adjEM)}${rk(statsB.adjEM_rk)}\n` +
            `**AdjO:** ${fmt(statsB.adjO)}${rk(statsB.adjO_rk)}\n` +
            `**AdjD:** ${fmt(statsB.adjD)}${rk(statsB.adjD_rk)}\n` +
            `**Tempo:** ${fmt(statsB.tempo)}${rk(statsB.tempo_rk)}`,
          inline: true
        },
        {
          name: '\u{1F50D} Edge Breakdown',
          value: (() => {
            const circleA = closestCircle(brandA.color);
            const circleB = closestCircle(brandB.color);
            return `**Efficiency:** ${advantage(statsA.team, statsB.team, statsA.adjEM, statsB.adjEM, true, circleA, circleB)}\n` +
            `**Offense:** ${advantage(statsA.team, statsB.team, statsA.adjO, statsB.adjO, true, circleA, circleB)}\n` +
            `**Defense:** ${advantage(statsA.team, statsB.team, statsA.adjD, statsB.adjD, false, circleA, circleB)}\n` +
            `**Tempo:** ${advantage(statsA.team, statsB.team, statsA.tempo, statsB.tempo, true, circleA, circleB)}`;
          })(),
          inline: false
        },
        {
          name: '\u{1F4CA} Offensive Comparison',
          value:
            `**${statsA.team}** ${fmt(statsA.adjO)}${rk(statsA.adjO_rk)} vs **${statsB.team}** AdjD ${fmt(statsB.adjD)}${rk(statsB.adjD_rk)}\n` +
            `**${statsB.team}** ${fmt(statsB.adjO)}${rk(statsB.adjO_rk)} vs **${statsA.team}** AdjD ${fmt(statsA.adjD)}${rk(statsA.adjD_rk)}`,
          inline: false
        }
      );

      const response = { embeds: [embed] };
      if (files.length > 0) response.files = files;

      await interaction.editReply(response);

    } catch (error) {

      console.error('MATCHUP COMMAND ERROR:', error);
      await interaction.editReply('Error executing matchup command.');

    }

  }

};
