const fs = require("fs");
const path = require("path");

const colorsPath = path.join(
  __dirname,
  "..",
  "assets",
  "ncaa-team-colors-master",
  "ncaa-team-colors.json"
);

const logosDir = path.join(__dirname, "..", "assets", "logos");

const teams = JSON.parse(fs.readFileSync(colorsPath, "utf8"));

function getBranding(teamName) {

  const input = teamName.toLowerCase();

  const team = teams.find(t =>
    t.name && t.name.toLowerCase().includes(input)
  );

  const color =
    team?.colors?.find(c => c !== "#FFFFFF") ||
    team?.colors?.[0] ||
    "#888888";

  const logoFile = fs.readdirSync(logosDir).find(file =>
    file.toLowerCase().includes(input)
  );

  const logoPath = logoFile
    ? path.join(logosDir, logoFile)
    : null;

  return {
    name: team?.name || teamName,
    color,
    logo: logoFile,
    logoPath
  };

}

module.exports = { getBranding };