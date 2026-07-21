import pandas as pd
import numpy as np
import os
import joblib
import holidays
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'Data.csv')
WEATHER_PATH = os.path.join(os.path.dirname(__file__), 'data', 'all_weather_data.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

def load_and_transform_data():
    print(f"Loading Authentic EPL Dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    weather_df = pd.read_csv(WEATHER_PATH)
    
    # 1. Clean Attendance
    df['attendance'] = df['attendance'].astype(str).str.replace('Att: ', '', regex=False).str.replace(',', '', regex=False)
    df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce')
    df = df.dropna(subset=['attendance'])
    
    # 2. Parse Date
    df['parsed_date'] = pd.to_datetime(df['Date'], format="%a %d %b %Y, %H:%M BST", errors='coerce')
    df = df.dropna(subset=['parsed_date'])
    
    # 3. Calculate Stadium Capacity (Max attendance historically recorded at that stadium)
    print("Calculating Stadium Capacities...")
    stadium_caps = df.groupby('stadium')['attendance'].max().reset_index()
    stadium_caps.rename(columns={'attendance': 'stadium_capacity'}, inplace=True)
    df = pd.merge(df, stadium_caps, on='stadium', how='left')
    
    # 4. Calculate Expected Popularity (1-10 Scale based on Home Team average attendance)
    print("Calculating Expected Popularity...")
    team_avg_att = df.groupby('Home_team_name')['attendance'].mean().reset_index()
    # Normalize to 1-10 scale
    min_att = team_avg_att['attendance'].min()
    max_att = team_avg_att['attendance'].max()
    team_avg_att['expected_popularity'] = ((team_avg_att['attendance'] - min_att) / (max_att - min_att) * 9) + 1
    team_avg_att['expected_popularity'] = team_avg_att['expected_popularity'].round().astype(int)
    team_avg_att.rename(columns={'Home_team_name': 'home_team_merge'}, inplace=True)
    
    # Merge popularity back into main df
    df['home_team_merge'] = df['Home_team_name']
    df = pd.merge(df, team_avg_att[['home_team_merge', 'expected_popularity']], on='home_team_merge', how='left')
    
    # 5. Extract Time & Holiday Features
    df['is_weekend'] = df['parsed_date'].dt.dayofweek.apply(lambda x: 1 if x >= 5 else 0)
    uk_holidays = holidays.UK()
    df['is_holiday'] = df['parsed_date'].dt.date.apply(lambda x: 1 if x in uk_holidays else 0)
    
    # 6. Merge Weather Data
    print("Merging Weather Data...")
    df['city'] = df['stadium'].apply(lambda x: x.split(',')[-1].strip() if ',' in x else x.strip())
    df['date_only'] = df['parsed_date'].dt.date
    
    weather_df['parsed_date'] = pd.to_datetime(weather_df['date']).dt.date
    weather_df.rename(columns={'location': 'city', 'max_temp °c': 'max_temp', 'rain mm': 'rain_mm'}, inplace=True)
    
    merged_df = pd.merge(df, weather_df[['city', 'parsed_date', 'max_temp', 'rain_mm']], 
                         left_on=['city', 'date_only'], right_on=['city', 'parsed_date'], how='inner')
    
    merged_df['rain_mm'] = merged_df['rain_mm'].fillna(0)
    
    # 7. Final Output (ANONYMIZED)
    final_cols = ['stadium_capacity', 'expected_popularity', 'is_weekend', 'is_holiday', 'max_temp', 'rain_mm', 'attendance']
    final_df = merged_df[final_cols]
    
    print(f"Transformed down to {len(final_df)} anonymous behavioral rows.")
    return final_df

def train():
    df = load_and_transform_data()
    
    # Inject balanced synthetic data to enforce the popularity scale across the board
    import numpy as np
    synthetic_rows = []
    # We add 1500 rows to balance out the 959 EPL rows
    for _ in range(1500):
        pop = np.random.randint(1, 11) # 1 to 10
        cap = np.random.choice([10000, 15000, 20000, 30000])
        
        # Enforce realistic fill percentages based on popularity
        if pop <= 3:
            fill = np.random.uniform(0.1, 0.35)
        elif pop <= 5:
            fill = np.random.uniform(0.35, 0.6)
        elif pop <= 8:
            fill = np.random.uniform(0.6, 0.85)
        else:
            fill = np.random.uniform(0.85, 1.0)
            
        # Weather penalties
        max_temp = np.random.uniform(5, 35)
        rain_mm = np.random.uniform(0, 50)
        
        if rain_mm > 15: fill -= 0.15
        if max_temp < 10 or max_temp > 32: fill -= 0.05
        
        # Weekend boost
        is_weekend = np.random.choice([0, 1])
        if is_weekend: fill += 0.05
        
        fill = max(0.1, min(1.0, fill))
        att = int(cap * fill)
        
        synthetic_rows.append({
            'stadium_capacity': cap,
            'expected_popularity': pop,
            'is_weekend': is_weekend,
            'is_holiday': 0,
            'max_temp': max_temp,
            'rain_mm': rain_mm,
            'attendance': att
        })
        
    df = pd.concat([df, pd.DataFrame(synthetic_rows)], ignore_index=True)
    
    X = df.drop(columns=['attendance'])
    y = df['attendance']
    
    # We no longer have categorical columns, so we can use a direct RandomForest!
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Authentic Behavioral model...")
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Evaluation:")
    print(f"Mean Absolute Error (MAE): {mae:.2f}")
    print(f"R-squared (R2) Score: {r2:.2f}")
    
    joblib.dump(model, MODEL_PATH)
    print(f"Authentic Behavioral Model successfully saved to {MODEL_PATH}")

if __name__ == '__main__':
    train()
