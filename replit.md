# KenPom Discord Bot

A Discord bot that displays NCAA basketball analytics from KenPom with team-branded embeds (colors and logos).

## Project Structure

```
index.js                - Bot entry point, command loader, interaction handler
commands/
  team.js               - /team slash command (season, conference, team selection with tabbed categories)
  matchup.js            - /matchup slash command (compare two teams using efficiency data)
services/
  kenpomService.js      - KenPom API client, conference/team data from local JSON
  teamBranding.js       - Team color and logo lookup
assets/
  conferences.json      - Conference/team data by season (scraped from Warren Nolan)
  logos/                 - Team logo PNGs (camelCase naming)
  ncaa-team-colors-master/
    ncaa-team-colors.json - Team color hex values
bot.py                  - Legacy Python bot (unused, replaced by Node.js)
kenpompy/               - Original Python KenPom scraper library (unused by bot)
```

## Technology Stack

- **Runtime**: Node.js 20
- **Framework**: discord.js v14
- **Dependencies**: axios, dotenv, cheerio (dev scraping)

## Bot Commands

- `/team [season] [conference] [team]`: Displays KenPom analytics for a team
  - **season**: Dropdown selection (2010-2026)
  - **conference**: Autocomplete from local conferences.json
  - **team**: Autocomplete filtered by selected conference
  - Interactive emoji buttons to switch between 7 stat categories
- `/matchup [season] [conference_a] [team_a] [conference_b] [team_b]`: Efficiency comparison
  - Side-by-side AdjEM, AdjO, AdjD, Tempo with ranks
  - Predicted spread, edge breakdown, and offensive matchup analysis

## Environment Variables Required

- `DISCORD_TOKEN`: Discord bot token
- `BASE_URL`: KenPom API base URL
- `KENPOM_API_KEY`: KenPom API key

## Workflow

The "Start application" workflow runs `node index.js`.

## Data Sources

- **Conference/Team lists**: Scraped from warrennolan.com and stored in `assets/conferences.json`
  - 2021-2026: Accurate per-season data
  - 2010-2020: Uses 2021 conference alignments as approximation
- **Team stats**: Fetched live from KenPom API at query time
- **Branding**: Local JSON (colors) and PNG files (logos)
