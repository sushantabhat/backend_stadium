import pandas as pd
import numpy as np
import re
import urllib.request
import json
import time
from datetime import datetime

# EPL Whitelist (teams that have been in EPL around 2004-2023)
EPL_TEAMS = set([
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion', 
    'Burnley', 'Cardiff City', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 
    'Huddersfield Town', 'Hull City', 'Leeds United', 'Leicester City', 'Liverpool', 
    'Luton Town', 'Manchester City', 'Manchester United', 'Middlesbrough', 'Newcastle United', 
    'Norwich City', 'Nottingham Forest', 'Queens Park Rangers', 'Reading', 'Sheffield United', 
    'Southampton', 'Stoke City', 'Sunderland', 'Swansea City', 'Tottenham Hotspur', 
    'Watford', 'West Bromwich Albion', 'West Ham United', 'Wigan Athletic', 'Wolverhampton Wanderers'
])

# Map teams to region for Weather (North vs South proxy)
NORTH_TEAMS = {'Manchester City', 'Manchester United', 'Liverpool', 'Everton', 'Newcastle United', 
               'Sunderland', 'Middlesbrough', 'Leeds United', 'Sheffield United', 'Burnley', 
               'Huddersfield Town', 'Hull City', 'Wigan Athletic'}
# Everyone else defaults to South (London/Midlands)

def get_weather_data(lat, lon, start_date, end_date):
    url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_mean,precipitation_sum&timezone=Europe%2FLondon"
    print(f"Fetching weather for lat:{lat}, lon:{lon}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())['daily']
                df_w = pd.DataFrame({
                    'date': data['time'],
                    'temp': data['temperature_2m_mean'],
                    'precip': data['precipitation_sum']
                })
                df_w['date'] = pd.to_datetime(df_w['date']).dt.date
                return df_w.set_index('date')
    except Exception as e:
        print("Failed to fetch weather", e)
    return None

def clean_attendance(val):
    if pd.isna(val): return None
    val = str(val).replace('Att:', '').replace(',', '').strip()
    match = re.search(r'\d+', val)
    if match: return int(match.group())
    return None

def parse_date(date_str):
    try:
        # Expected format: "Sun 16 Apr 2023, 14:00 BST"
        # We'll extract just the date part "16 Apr 2023"
        match = re.search(r'\d{1,2}\s[A-Za-z]{3}\s\d{4}', str(date_str))
        if match:
            return pd.to_datetime(match.group(), format='%d %b %Y').date()
        return pd.to_datetime(date_str).date()
    except:
        return None

def main():
    print("1. Loading raw data...")
    df = pd.read_csv('data/epl.csv', low_memory=False)
    
    # Clean up column names for consistency
    df.rename(columns={'Home_team_name': 'HomeTeam', 'Away_team_name': 'AwayTeam', 
                       'Home_team_score': 'FTHG', 'Away_team_score': 'FTAG'}, inplace=True)
    
    print("2. Filtering strictly for EPL matches...")
    # Both teams must be in whitelist
    df = df[df['HomeTeam'].isin(EPL_TEAMS) & df['AwayTeam'].isin(EPL_TEAMS)].copy()
    
    # Parse dates to sort chronologically
    df['parsed_date'] = df['Date'].apply(parse_date)
    df = df.dropna(subset=['parsed_date'])
    df = df.sort_values(['Season', 'parsed_date']).reset_index(drop=True)
    
    print(f"EPL Matches isolated: {len(df)}")
    
    print("3. Calculating Running Points...")
    # Create running points dictionary
    df['Home_Team_Points'] = 0
    df['Away_Team_Points'] = 0
    
    # Group by season to calculate points independently per season
    for season in df['Season'].unique():
        season_mask = df['Season'] == season
        points_dict = {team: 0 for team in EPL_TEAMS}
        
        # Iterate over matches in this season chronologically
        for idx in df[season_mask].index:
            home = df.loc[idx, 'HomeTeam']
            away = df.loc[idx, 'AwayTeam']
            hg = df.loc[idx, 'FTHG']
            ag = df.loc[idx, 'FTAG']
            
            # Record points going INTO the match
            df.loc[idx, 'Home_Team_Points'] = points_dict.get(home, 0)
            df.loc[idx, 'Away_Team_Points'] = points_dict.get(away, 0)
            
            # Update points for the next match based on result
            if pd.notna(hg) and pd.notna(ag):
                try:
                    hg, ag = int(hg), int(ag)
                    if hg > ag:
                        points_dict[home] = points_dict.get(home, 0) + 3
                    elif hg < ag:
                        points_dict[away] = points_dict.get(away, 0) + 3
                    else:
                        points_dict[home] = points_dict.get(home, 0) + 1
                        points_dict[away] = points_dict.get(away, 0) + 1
                except:
                    pass
    
    print("4. Fetching Weather Data (2013-2023)...")
    # Fetch 10 years of data for North (Manchester) and South (London)
    # Using 2004-2023 to cover everything
    min_date = df['parsed_date'].min().strftime('%Y-%m-%d')
    max_date = df['parsed_date'].max().strftime('%Y-%m-%d')
    
    weather_north = get_weather_data(53.48, -2.24, min_date, max_date) # Manchester
    weather_south = get_weather_data(51.51, -0.13, min_date, max_date) # London
    
    df['Temperature'] = 15.0
    df['Rainfall'] = 0.0
    
    if weather_north is not None and weather_south is not None:
        for idx in df.index:
            match_date = df.loc[idx, 'parsed_date']
            home_team = df.loc[idx, 'HomeTeam']
            
            w_df = weather_north if home_team in NORTH_TEAMS else weather_south
            if match_date in w_df.index:
                temp = w_df.loc[match_date, 'temp']
                rain = w_df.loc[match_date, 'precip']
                df.loc[idx, 'Temperature'] = temp if pd.notna(temp) else 15.0
                df.loc[idx, 'Rainfall'] = rain if pd.notna(rain) else 0.0
    
    print("5. Dropping missing attendance & cleaning up...")
    df['attendance'] = df['attendance'].apply(clean_attendance)
    df = df.dropna(subset=['attendance'])
    df['attendance'] = df['attendance'].astype(int)
    
    keep_cols = ['HomeTeam', 'AwayTeam', 'stadium', 'Season', 'parsed_date', 
                 'Home_Team_Points', 'Away_Team_Points', 'Temperature', 'Rainfall', 'attendance']
    df = df[keep_cols]
    df.rename(columns={'parsed_date': 'Date'}, inplace=True)
    
    df.to_csv('data/final_epl_data.csv', index=False)
    print(f"\nFinal dataset shape: {df.shape}")
    print("\nSample Data:")
    print(df.head())

if __name__ == "__main__":
    main()
