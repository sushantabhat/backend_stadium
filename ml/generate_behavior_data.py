import pandas as pd
import random
import datetime

# We will generate 5000 abstract matches to teach the Random Forest human behavior.

matches = []
match_types = ["League", "Cup", "Final", "International"]
match_type_weights = [0.7, 0.15, 0.05, 0.10]

start_date = datetime.date(2018, 1, 1)

for i in range(5000):
    match_date = start_date + datetime.timedelta(days=i % 1000) # Loop dates
    
    # Random capacity between 5k and 50k
    capacity = random.choice([5000, 10000, 15000, 20000, 30000, 50000])
    
    # Expected Popularity (1 to 10)
    popularity = random.randint(1, 10)
    
    # Match Type
    match_type = random.choices(match_types, weights=match_type_weights)[0]
    
    # Weather
    max_temp = round(random.uniform(5.0, 35.0), 1)
    rain_mm = round(random.uniform(0.0, 15.0) if random.random() > 0.8 else 0.0, 1)
    
    is_weekend = 1 if match_date.weekday() >= 5 else 0
    # Randomly assign holiday 3% of the time for the abstract dataset
    is_holiday = 1 if random.random() < 0.03 else 0
    
    # --- CALCULATE BEHAVIORAL ATTENDANCE ---
    
    # Base fill percentage based purely on popularity
    # Popularity 1 = ~20% full, Popularity 10 = ~90% full
    fill_percentage = 0.20 + ((popularity - 1) * 0.077)
    
    # Modifiers
    if is_weekend: fill_percentage += 0.15
    if is_holiday: fill_percentage += 0.10
    
    # Match Type Modifiers
    if match_type == "Final": fill_percentage += 0.25
    if match_type == "International": fill_percentage += 0.30
    if match_type == "Cup": fill_percentage += 0.05
    
    # Weather Modifiers
    if rain_mm > 0: fill_percentage -= 0.20
    if rain_mm > 5.0: fill_percentage -= 0.15 # heavy rain
    if max_temp < 10.0 or max_temp > 30.0: fill_percentage -= 0.05
    
    # Cap at 115% capacity (Stadium Overflow) and floor at 5%
    if fill_percentage > 1.15: fill_percentage = 1.15
    if fill_percentage < 0.05: fill_percentage = 0.05
    
    # Calculate final number
    attendance = int(capacity * fill_percentage)
    
    # Add minor random noise (e.g., +/- 3% of capacity) so it's not a perfect mathematical formula
    noise = int(capacity * random.uniform(-0.03, 0.03))
    attendance += noise
    
    absolute_max = int(capacity * 1.15)
    if attendance > absolute_max: attendance = absolute_max
    if attendance < 100: attendance = 100
    
    matches.append({
        "stadium_capacity": capacity,
        "expected_popularity": popularity,
        "match_type": match_type,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "max_temp": max_temp,
        "rain_mm": rain_mm,
        "attendance": attendance
    })

df = pd.DataFrame(matches)
df.to_csv("data/Behavioral_Data.csv", index=False)
print(f"Generated Behavioral_Data.csv with {len(df)} abstract matches.")
