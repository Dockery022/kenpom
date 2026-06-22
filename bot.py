import os
import discord
import json
import re
from discord import app_commands
from discord.ext import commands
from dotenv import load_dotenv
import kenpompy.summary as kp
import kenpompy.team as kpt
from kenpompy.utils import login
import pandas as pd
from typing import Optional

load_dotenv()

TOKEN = os.getenv('DISCORD_TOKEN')
KENPOM_EMAIL = os.getenv('KENPOM_EMAIL')
KENPOM_PASSWORD = os.getenv('KENPOM_PASSWORD')

# Load team colors from JSON
TEAM_COLORS = []
try:
    colors_path = 'assets/ncaa-team-colors-master/ncaa-team-colors.json'
    if os.path.exists(colors_path):
        with open(colors_path, 'r') as f:
            TEAM_COLORS = json.load(f)
            print(f"Loaded colors for {len(TEAM_COLORS)} teams")
except Exception as e:
    print(f"Error loading colors: {e}")

def get_branding(team_name):
    input_name = team_name.lower()
    
    # Find matching team in colors
    match = next((t for t in TEAM_COLORS if t.get('name') and input_name in t['name'].lower()), None)
    
    color = discord.Color.blue()
    if match and 'colors' in match and match['colors']:
        # Filter out white if possible, otherwise take first
        hex_color = next((c for c in match['colors'] if c.upper() != '#FFFFFF'), match['colors'][0])
        try:
            color = discord.Color.from_str(hex_color)
        except:
            pass
            
    # Check for logo in assets/logos
    logo_url = None
    logos_dir = 'assets/logos'
    if os.path.exists(logos_dir):
        logo_file = next((f for f in os.listdir(logos_dir) if input_name in f.lower()), None)
        if logo_file:
            logo_url = logo_file

    return color, logo_url

class KenpomBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix='!', intents=intents)
        self.browser = None

    async def setup_hook(self):
        # We need to sync to register the new Choice parameter
        await self.tree.sync()
        print(f"Slash commands ready for {self.user}")

    async def on_ready(self):
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        # await self.tree.sync()
        print('------')

    def get_browser(self):
        if self.browser is None:
            if not KENPOM_EMAIL or not KENPOM_PASSWORD:
                return None
            self.browser = login(KENPOM_EMAIL, KENPOM_PASSWORD)
        return self.browser

    def reset_browser(self):
        self.browser = None
        return self.get_browser()

bot = KenpomBot()

@bot.tree.command(name='team', description='View full KenPom team analytics')
@app_commands.describe(
    season='Select season',
    team_name='Team name'
)
@app_commands.choices(season=[
    app_commands.Choice(name=str(year), value=str(year))
    for year in range(2025, 2019, -1)
])
async def team(interaction: discord.Interaction, season: app_commands.Choice[str], team_name: str):
    await interaction.response.defer()
    b = bot.get_browser()
    if not b:
        await interaction.followup.send("KenPom credentials not configured.")
        return
    
    selected_season = season.value
    try:
        from kenpompy.team import get_valid_teams
        from kenpompy.misc import get_current_season
        
        # Validate season is an integer
        try:
            target_season = int(selected_season)
        except ValueError:
            await interaction.followup.send(f"Invalid season format: {selected_season}. Please use a year like 2024.")
            return

        def perform_lookup(browser_obj):
            valid_teams = get_valid_teams(browser_obj, target_season)
            
            matched_team = None
            if team_name in valid_teams:
                matched_team = team_name
            else:
                for vt in valid_teams:
                    if vt.lower() == team_name.lower():
                        matched_team = vt
                        break
                if not matched_team:
                    for vt in valid_teams:
                        if team_name.lower() in vt.lower():
                            matched_team = vt
                            break
            return matched_team

        try:
            matched_team = perform_lookup(b)
        except Exception as e:
            if "Connection aborted" in str(e) or "Remote end closed connection" in str(e):
                b = bot.reset_browser()
                matched_team = perform_lookup(b)
            else:
                raise e
        
        if not matched_team:
            await interaction.followup.send(f"Could not find team '{team_name}' in the {selected_season} season. Please check the spelling.")
            return

        try:
            report = kpt.get_scouting_report(b, matched_team, season=target_season)
        except Exception as e:
            if "Connection aborted" in str(e) or "Remote end closed connection" in str(e):
                b = bot.reset_browser()
                report = kpt.get_scouting_report(b, matched_team, season=target_season)
            else:
                raise e

        # Get branding
        brand_color, logo_url = get_branding(matched_team)

        embed = discord.Embed(title=f"Analytics: {matched_team} ({selected_season})", color=brand_color)
        
        # In Replit, if we have local files we want to show in Discord, 
        # we usually need to attach them or use a public URL.
        # For now, we'll try to use the logo_url if it's a valid URL, 
        # or handle local file attachment if the user provides the files.
        if logo_url:
            if logo_url.startswith('http'):
                embed.set_thumbnail(url=logo_url)
            else:
                # Handle local file attachment
                logo_path = f"assets/logos/{logo_url}"
                if os.path.exists(logo_path):
                    file = discord.File(logo_path, filename=logo_url)
                    embed.set_thumbnail(url=f"attachment://{logo_url}")
                    await interaction.followup.send(file=file, embed=embed)
                    return
            
        embed.add_field(name="Offense (AdjOE)", value=f"{report['OE']} (Rank: {report['OE.Rank']})", inline=True)
        embed.add_field(name="Defense (AdjDE)", value=f"{report['DE']} (Rank: {report['DE.Rank']})", inline=True)
        embed.add_field(name="Tempo", value=f"{report['Tempo']} (Rank: {report['Tempo.Rank']})", inline=True)
        await interaction.followup.send(embed=embed)
    except Exception as e:
        await interaction.followup.send(f"Error: {str(e)}")

if __name__ == "__main__":
    if not TOKEN:
        print("Error: DISCORD_TOKEN not found.")
    else:
        bot.run(TOKEN)
