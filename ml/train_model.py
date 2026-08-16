import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import pickle
import os

CAPACITY_MAP = {
    'Old Trafford': 74000,
    'Tottenham Hotspur': 62000,
    'Emirates': 60000,
    'London Stadium': 60000,
    'Etihad': 55000,
    'Anfield': 54000,
    'St. James': 52000,
    'Stadium of Light': 49000,
    'Villa Park': 42000,
    'Stamford Bridge': 40000,
    'Goodison Park': 39000,
    'Elland Road': 37000,
    'Riverside': 34000,
    'King Power': 32000,
    'Molineux': 32000,
    'St. Mary': 32000,
    'Amex': 31000,
    'Carrow Road': 27000,
    'Selhurst Park': 26000,
    'Craven Cottage': 25000,
    'Turf Moor': 21000,
    'Vicarage Road': 21000,
    'Liberty Stadium': 21000,
    'Loftus Road': 18000,
    'Vitality': 11000,
    'Kenilworth': 10000
}

def get_capacity(stadium_name):
    for key, cap in CAPACITY_MAP.items():
        if key.lower() in str(stadium_name).lower():
            return cap
    return 30000 # Default

def main():
    print("Loading data...")
    df = pd.read_csv('data/final_epl_data.csv')
    
    print("Feature Engineering (Tiers and Capacity)...")
    # Calculate historical tier for each team based on their end-of-season points
    season_points = df.groupby(['Season', 'HomeTeam'])['Home_Team_Points'].max().reset_index()
    team_avg = season_points.groupby('HomeTeam')['Home_Team_Points'].mean()
    
    tier_map = {}
    for team, pts in team_avg.items():
        if pts >= 60: tier_map[team] = 1 # Top
        elif pts >= 40: tier_map[team] = 2 # Mid
        else: tier_map[team] = 3 # Bottom
        
    df['Home_Tier'] = df['HomeTeam'].map(tier_map).fillna(2)
    df['Away_Tier'] = df['AwayTeam'].map(tier_map).fillna(2)
    
    # Map stadium to capacity
    df['Capacity'] = df['stadium'].apply(get_capacity)
    
    # Time features
    df['Date'] = pd.to_datetime(df['Date'])
    df['Month'] = df['Date'].dt.month
    df['DayOfWeek'] = df['Date'].dt.dayofweek
    
    features = ['Home_Tier', 'Away_Tier', 'Capacity', 'Temperature', 'Rainfall', 'Month', 'DayOfWeek']
    X = df[features]
    y = df['attendance']
    
    # The target needs to be a percentage of capacity (Fill Rate) so it perfectly translates to NPL!
    # If we predict raw attendance (e.g. 55000), it might exceed a 15000 NPL stadium.
    # Instead, let's predict Fill Rate (0.0 to 1.0) and multiply by Capacity in predict.py!
    y_fill_rate = y / df['Capacity']
    # Cap fill rate at 1.0 just in case
    y_fill_rate = np.clip(y_fill_rate, 0, 1.0)
    
    print("Training Universal Model (Predicting Stadium Fill Rate)...")
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10))
    ])
    
    pipeline.fit(X, y_fill_rate)
    score = pipeline.score(X, y_fill_rate)
    print(f"Training R^2 Score (Fill Rate): {score:.3f}")
    
    os.makedirs('models', exist_ok=True)
    with open('models/universal_model.pkl', 'wb') as f:
        pickle.dump(pipeline, f)
    print("Model saved to models/universal_model.pkl")

if __name__ == "__main__":
    main()
