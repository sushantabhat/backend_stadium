import pandas as pd
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = joblib.load(MODEL_PATH)

scenarios = [
    # 1. Baseline
    {'stadium_capacity': 15000, 'expected_popularity': 5, 'is_weekend': 0, 'is_holiday': 0, 'max_temp': 22.0, 'rain_mm': 0.0, 'desc': 'Baseline (Average League Match)'},
    
    # 2. Huge match, perfect conditions
    {'stadium_capacity': 15000, 'expected_popularity': 9, 'is_weekend': 1, 'is_holiday': 0, 'max_temp': 24.0, 'rain_mm': 0.0, 'desc': 'High Demand, Weekend, Sunny'},
    
    # 3. Huge match, terrible weather
    {'stadium_capacity': 15000, 'expected_popularity': 9, 'is_weekend': 0, 'is_holiday': 0, 'max_temp': 15.0, 'rain_mm': 30.0, 'desc': 'High Demand, Weekday, Heavy Rain'},
    
    # 4. Low demand match
    {'stadium_capacity': 15000, 'expected_popularity': 2, 'is_weekend': 0, 'is_holiday': 0, 'max_temp': 22.0, 'rain_mm': 0.0, 'desc': 'Low Demand (Friendly)'},
    
    # 5. Massive Stadium, Huge Match
    {'stadium_capacity': 30000, 'expected_popularity': 10, 'is_weekend': 1, 'is_holiday': 1, 'max_temp': 22.0, 'rain_mm': 0.0, 'desc': 'World Cup Final, Holiday, Huge Venue'},
    
    # 6. Cold weather impact
    {'stadium_capacity': 15000, 'expected_popularity': 6, 'is_weekend': 1, 'is_holiday': 0, 'max_temp': 5.0, 'rain_mm': 0.0, 'desc': 'Good Match, Freezing Temp'}
]

print("## Machine Learning Prediction Accuracy Report\n")
print("| Scenario | Capacity | Popularity (1-10) | Weekend/Holiday | Weather | Predicted Attendance | Occupancy |")
print("|:---|:---:|:---:|:---:|:---:|:---:|:---:|")

for s in scenarios:
    df = pd.DataFrame([{
        'stadium_capacity': s['stadium_capacity'],
        'expected_popularity': s['expected_popularity'],
        'is_weekend': s['is_weekend'],
        'is_holiday': s['is_holiday'],
        'max_temp': s['max_temp'],
        'rain_mm': s['rain_mm']
    }])
    
    pred = model.predict(df)[0]
    
    # Ensure prediction doesn't exceed capacity (logic mirroring our node server)
    if pred > s['stadium_capacity']: 
        pred = s['stadium_capacity']
    if pred < 0:
        pred = 0
        
    day_status = "Weekend" if s['is_weekend'] else "Holiday" if s['is_holiday'] else "Weekday"
    weather = f"{s['max_temp']}°C, {s['rain_mm']}mm"
    occupancy = (pred / s['stadium_capacity']) * 100
    
    print(f"| {s['desc']} | {s['stadium_capacity']:,} | {s['expected_popularity']} | {day_status} | {weather} | **{int(pred):,}** | {occupancy:.1f}% |")

