import pandas as pd
import numpy as np
import random
import datetime

matches = []
match_stages = ['League Stage', 'Quarter-Finals', 'Semi-Finals', 'Finals']
match_stage_weights = [0.7, 0.1, 0.1, 0.1]
match_times = ['Day', 'Day-Night']

start_date = datetime.date(2023, 1, 1)

for i in range(5000):
    match_date = start_date + datetime.timedelta(days=i % 1000)
    
    capacity = random.choice([10000, 15000, 20000, 30000])
    team_a_tier = random.choice([1, 2, 3])
    team_b_tier = random.choice([1, 2, 3])
    match_stage = random.choices(match_stages, weights=match_stage_weights)[0]
    has_team_rivalry = 1 if random.random() > 0.8 else 0
    is_home_match = 1 if random.random() > 0.7 else 0
    match_time = random.choice(match_times)
    
    # Economics
    average_ticket_price = random.choice([200, 500, 1000, 2500, 5000])
    
    # Weather
    max_temp = round(random.uniform(5.0, 38.0), 1)
    rain_mm = round(random.uniform(0.0, 30.0) if random.random() > 0.8 else 0.0, 1)
    
    # Calendar
    is_weekend = 1 if match_date.weekday() >= 5 else 0
    is_holiday = 1 if random.random() < 0.05 else 0
    
    # --- SYNTHETIC LOGIC FOR ATTENDANCE ---
    
    # Base fill based on Team Tiers (1 is best)
    tier_score = (4 - team_a_tier) + (4 - team_b_tier) # Max 6, Min 2
    fill_percentage = 0.2 + (tier_score * 0.1) # Min 0.4, Max 0.8
    
    if has_team_rivalry: fill_percentage += 0.2
    if is_home_match: fill_percentage += 0.1
    if match_stage == 'Finals': fill_percentage += 0.4
    if match_stage == 'Semi-Finals': fill_percentage += 0.2
    if match_stage == 'Quarter-Finals': fill_percentage += 0.1
    
    if match_time == 'Day-Night': fill_percentage += 0.15
    if is_weekend: fill_percentage += 0.1
    if is_holiday: fill_percentage += 0.1
    
    # Ticket price elasticity
    if average_ticket_price > 2000 and match_stage == 'League Stage':
        fill_percentage -= 0.3 # Too expensive for a regular game
    elif average_ticket_price > 2000 and match_stage == 'Finals':
        fill_percentage -= 0.05 # Willing to pay
    elif average_ticket_price <= 500:
        fill_percentage += 0.1 # Cheap tickets boost sales
        
    # Weather penalties
    if rain_mm > 0: fill_percentage -= 0.1
    if rain_mm > 10.0: fill_percentage -= 0.2
    if rain_mm > 20.0: fill_percentage -= 0.4 # Heavy rain kills attendance unless it's a final
    
    if match_stage == 'Finals' and rain_mm > 20.0:
        fill_percentage += 0.25 # People show up for finals anyway
        
    if max_temp < 10.0 or max_temp > 33.0: fill_percentage -= 0.1
    
    # Boundaries
    fill_percentage = max(0.05, min(1.0, fill_percentage))
    
    # Random Noise
    fill_percentage += random.uniform(-0.05, 0.05)
    fill_percentage = max(0.01, min(1.0, fill_percentage))
    
    attendance = int(capacity * fill_percentage)
    
    matches.append({
        "stadium_capacity": capacity,
        "team_a_tier": team_a_tier,
        "team_b_tier": team_b_tier,
        "match_stage": match_stage,
        "has_team_rivalry": has_team_rivalry,
        "is_home_match": is_home_match,
        "match_time": match_time,
        "average_ticket_price": average_ticket_price,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "max_temp": max_temp,
        "rain_mm": rain_mm,
        "attendance": attendance
    })

df = pd.DataFrame(matches)
df.to_csv("data/Behavioral_Data.csv", index=False)
print(f"Generated NPL Behavioral_Data.csv with {len(df)} abstract matches.")
