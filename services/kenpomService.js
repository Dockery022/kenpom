const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.KENPOM_API_KEY;

const conferencesPath = path.join(__dirname, "..", "assets", "conferences.json");
const CONFERENCES_DATA = JSON.parse(fs.readFileSync(conferencesPath, "utf8"));

async function fetchAPI(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`
      },
      timeout: 10000
    });

    const data = res.data && res.data.data ? res.data.data : res.data;

    if (Array.isArray(data)) return data;

    return [];
  } catch (error) {
    console.error(`KenPom API request failed: ${url}`);
    console.error(error.message);
    return [];
  }
}

const NAME_ALIASES = {
  "North Carolina State": "N.C. State",
  "Saint John's": "St. John's",
  "Saint Bonaventure": "St. Bonaventure",
  "Saint Thomas": "St. Thomas",
  "Ole Miss": "Mississippi",
  "FAU": "Florida Atlantic",
  "Loyola-Chicago": "Loyola Chicago",
  "Loyola-Maryland": "Loyola MD",
  "Loyola-Marymount": "Loyola Marymount",
};

async function getTeamStats(teamName, season) {

  const year = season || new Date().getFullYear();

  try {

    const teams = await fetchAPI(`${BASE_URL}/api.php?endpoint=teams&y=${year}`);

    function normalize(name) {
      return name
        .toLowerCase()
        .replace(/[()]/g, '')
        .replace(/\bst\.\s*/g, 'state ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const aliased = NAME_ALIASES[teamName] || teamName;
    const searchNorm = normalize(aliased);

    let team = teams.find(t => normalize(t.TeamName) === searchNorm);

    if (!team) {
      team = teams.find(t => normalize(t.TeamName).includes(searchNorm));
    }

    if (!team) {
      const searchWords = searchNorm.split(' ');
      team = teams.find(t => {
        const tn = normalize(t.TeamName);
        return searchWords.every(w => tn.includes(w));
      });
    }

    if (!team) {
      const candidates = teams.filter(t => searchNorm.includes(normalize(t.TeamName)));
      if (candidates.length > 0) {
        team = candidates.reduce((best, cur) =>
          normalize(cur.TeamName).length > normalize(best.TeamName).length ? cur : best
        );
      }
    }

    if (!team) return null;

    const teamNameExact = team.TeamName;

    const [
      ratings,
      fourFactors,
      miscStats,
      pointDist,
      heightStats
    ] = await Promise.all([

      fetchAPI(`${BASE_URL}/api.php?endpoint=ratings&y=${year}`),
      fetchAPI(`${BASE_URL}/api.php?endpoint=four-factors&y=${year}`),
      fetchAPI(`${BASE_URL}/api.php?endpoint=misc-stats&y=${year}`),
      fetchAPI(`${BASE_URL}/api.php?endpoint=pointdist&y=${year}`),
      fetchAPI(`${BASE_URL}/api.php?endpoint=height&y=${year}`)

    ]);

    const r = ratings?.find(t => t.TeamName === teamNameExact);
    const f = fourFactors?.find(t => t.TeamName === teamNameExact);
    const m = miscStats?.find(t => t.TeamName === teamNameExact);
    const p = pointDist?.find(t => t.TeamName === teamNameExact);
    const h = heightStats?.find(t => t.TeamName === teamNameExact);

    return {

      season: year,
      team: teamNameExact,
      rank: r?.Rk || r?.Rank,

      adjEM: r?.AdjEM,
      adjEM_rk: r?.RankAdjEM,
      adjO: r?.AdjOE,
      adjO_rk: r?.RankAdjOE,
      adjD: r?.AdjDE,
      adjD_rk: r?.RankAdjDE,
      tempo: r?.AdjTempo,
      tempo_rk: r?.RankAdjTempo,
      avg_poss_off: r?.APL_Off,
      avg_poss_off_rk: r?.RankAPL_Off,
      avg_poss_def: r?.APL_Def,
      avg_poss_def_rk: r?.RankAPL_Def,

      efg_off: f?.eFG_Pct,
      efg_off_rk: f?.eFG_Pct_Rk || f?.RankeFG_Pct,
      efg_def: f?.DeFG_Pct,
      efg_def_rk: f?.DeFG_Pct_Rk || f?.RankDeFG_Pct,

      to_off: f?.TO_Pct,
      to_off_rk: f?.TO_Pct_Rk || f?.RankTO_Pct,
      to_def: f?.DTO_Pct,
      to_def_rk: f?.DTO_Pct_Rk || f?.RankDTO_Pct,

      orb_off: f?.OR_Pct,
      orb_off_rk: f?.OR_Pct_Rk || f?.RankOR_Pct,
      orb_def: f?.DOR_Pct,
      orb_def_rk: f?.DOR_Pct_Rk || f?.RankDOR_Pct,

      ft_off: f?.FT_Rate,
      ft_off_rk: f?.FT_Rate_Rk || f?.RankFT_Rate,
      ft_def: f?.DFT_Rate,
      ft_def_rk: f?.DFT_Rate_Rk || f?.RankDFT_Rate,

      three_off: m?.FG3Pct,
      three_off_rk: m?.FG3Pct_Rk || m?.RankFG3Pct,
      three_def: m?.OppFG3Pct,
      three_def_rk: m?.OppFG3Pct_Rk || m?.RankOppFG3Pct,

      two_off: m?.FG2Pct,
      two_off_rk: m?.FG2Pct_Rk || m?.RankFG2Pct,
      two_def: m?.OppFG2Pct,
      two_def_rk: m?.OppFG2Pct_Rk || m?.RankOppFG2Pct,

      ft_pct: m?.FTPct,
      ft_pct_rk: m?.FTPct_Rk || m?.RankFTPct,
      ft_def_pct: m?.OppFTPct,
      ft_def_pct_rk: m?.OppFTPct_Rk || m?.RankOppFTPct,

      blk_off: m?.OppBlockPct,
      blk_off_rk: m?.RankOppBlockPct,
      blk_def: m?.BlockPct,
      blk_def_rk: m?.RankBlockPct,

      stl_off: m?.OppStlRate != null ? m.OppStlRate * 100 : null,
      stl_off_rk: m?.RankOppStlRate,
      stl_def: m?.StlRate != null ? m.StlRate * 100 : null,
      stl_def_rk: m?.RankStlRate,

      nst_off: m?.NSTRate,
      nst_off_rk: m?.RankNSTRate,
      nst_def: m?.OppNSTRate,
      nst_def_rk: m?.RankOppNSTRate,

      avg2pt_off: m?.Avg2PADist,
      avg2pt_off_rk: m?.RankAvg2PADist,
      avg2pt_def: m?.OppAvg2PADist,
      avg2pt_def_rk: m?.RankOppAvg2PADist,

      three_rate_off: m?.F3GRate,
      three_rate_off_rk: m?.F3GRate_Rk || m?.RankF3GRate,
      three_rate_def: m?.OppF3GRate,
      three_rate_def_rk: m?.OppF3GRate_Rk || m?.RankOppF3GRate,

      ast_rate_off: m?.ARate,
      ast_rate_off_rk: m?.ARate_Rk || m?.RankARate,
      ast_rate_def: m?.OppARate,
      ast_rate_def_rk: m?.OppARate_Rk || m?.RankOppARate,

      pt3_off: p?.OffFg3,
      pt3_off_rk: p?.RankOffFg3,
      pt3_def: p?.DefFg3,
      pt3_def_rk: p?.RankDefFg3,

      pt2_off: p?.OffFg2,
      pt2_off_rk: p?.RankOffFg2,
      pt2_def: p?.DefFg2,
      pt2_def_rk: p?.RankDefFg2,

      ft_dist_off: p?.OffFt,
      ft_dist_off_rk: p?.RankOffFt,
      ft_dist_def: p?.DefFt,
      ft_dist_def_rk: p?.RankDefFt,

      sos: r?.SOS,
      sos_rk: r?.RankSOS,
      sos_nc: r?.NCSOS,
      sos_nc_rk: r?.RankNCSOS,
      sos_off: r?.SOSO,
      sos_off_rk: r?.RankSOSO,
      sos_def: r?.SOSD,
      sos_def_rk: r?.RankSOSD,

      bench_minutes: h?.Bench,
      bench_rk: h?.BenchRank,
      experience: h?.Exp,
      exp_rk: h?.ExpRank,
      continuity: h?.Continuity != null ? h.Continuity * 100 : null,
      cont_rk: h?.RankContinuity,
      height: h?.AvgHgt,
      height_rk: h?.AvgHgtRank

    };

  } catch (error) {

    console.error("KenPom API error:", error.message);
    return null;

  }

}

function getConferences(season) {
  const yearData = CONFERENCES_DATA[String(season)];
  if (!yearData) {
    const closestYear = Object.keys(CONFERENCES_DATA).sort((a, b) => Math.abs(a - season) - Math.abs(b - season))[0];
    return Object.keys(CONFERENCES_DATA[closestYear]).sort();
  }
  return Object.keys(yearData).sort();
}

function getTeams(season, conference) {
  const yearData = CONFERENCES_DATA[String(season)];
  if (!yearData) {
    const closestYear = Object.keys(CONFERENCES_DATA).sort((a, b) => Math.abs(a - season) - Math.abs(b - season))[0];
    if (conference && CONFERENCES_DATA[closestYear][conference]) {
      return CONFERENCES_DATA[closestYear][conference].sort();
    }
    return Object.values(CONFERENCES_DATA[closestYear]).flat().sort();
  }
  if (conference && yearData[conference]) {
    return yearData[conference].sort();
  }
  return Object.values(yearData).flat().sort();
}

module.exports = { getTeamStats, getConferences, getTeams };
