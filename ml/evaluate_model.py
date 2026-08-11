"""
Comprehensive Model Evaluation Script for Final Report
Evaluates the Random Forest attendance prediction model with proper train/test split,
cross-validation, and multiple regression metrics.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    mean_absolute_percentage_error
)

CAPACITY_MAP = {
    'Old Trafford': 74000, 'Tottenham Hotspur': 62000, 'Emirates': 60000,
    'London Stadium': 60000, 'Etihad': 55000, 'Anfield': 54000,
    'St. James': 52000, 'Stadium of Light': 49000, 'Villa Park': 42000,
    'Stamford Bridge': 40000, 'Goodison Park': 39000, 'Elland Road': 37000,
    'Riverside': 34000, 'King Power': 32000, 'Molineux': 32000,
    'St. Mary': 32000, 'Amex': 31000, 'Carrow Road': 27000,
    'Selhurst Park': 26000, 'Craven Cottage': 25000, 'Turf Moor': 21000,
    'Vicarage Road': 21000, 'Liberty Stadium': 21000, 'Loftus Road': 18000,
    'Vitality': 11000, 'Kenilworth': 10000
}

def get_capacity(stadium_name):
    for key, cap in CAPACITY_MAP.items():
        if key.lower() in str(stadium_name).lower():
            return cap
    return 30000

def main():
    # Load data
    df = pd.read_csv('data/final_epl_data.csv')

    # Feature engineering (same as train_model.py)
    season_points = df.groupby(['Season', 'HomeTeam'])['Home_Team_Points'].max().reset_index()
    team_avg = season_points.groupby('HomeTeam')['Home_Team_Points'].mean()
    tier_map = {}
    for team, pts in team_avg.items():
        if pts >= 60: tier_map[team] = 1
        elif pts >= 40: tier_map[team] = 2
        else: tier_map[team] = 3
    df['Home_Tier'] = df['HomeTeam'].map(tier_map).fillna(2)
    df['Away_Tier'] = df['AwayTeam'].map(tier_map).fillna(2)
    df['Capacity'] = df['stadium'].apply(get_capacity)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Month'] = df['Date'].dt.month
    df['DayOfWeek'] = df['Date'].dt.dayofweek

    features = ['Home_Tier', 'Away_Tier', 'Capacity', 'Temperature', 'Rainfall', 'Month', 'DayOfWeek']
    X = df[features]
    y_fill_rate = np.clip(df['attendance'] / df['Capacity'], 0, 1.0)

    print("=" * 60)
    print("SMART STADIUM - AI MODEL EVALUATION REPORT")
    print("=" * 60)
    print(f"\nDataset Size: {len(df)} matches")
    print(f"Features Used: {features}")
    print(f"Target Variable: Stadium Fill Rate (0.0 - 1.0)")
    print(f"Model: Random Forest Regressor (n_estimators=100, max_depth=10)")

    # ─── 1. Training Score (Full Dataset) ───
    pipeline_full = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10))
    ])
    pipeline_full.fit(X, y_fill_rate)
    train_r2 = pipeline_full.score(X, y_fill_rate)
    print(f"\n--- 1. Training R² Score (Full Dataset) ---")
    print(f"R² Score: {train_r2:.4f}")

    # ─── 2. Train/Test Split (80/20) ───
    X_train, X_test, y_train, y_test = train_test_split(X, y_fill_rate, test_size=0.2, random_state=42)
    pipeline_split = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10))
    ])
    pipeline_split.fit(X_train, y_train)
    y_pred = pipeline_split.predict(X_test)

    test_r2 = r2_score(y_test, y_pred)
    test_mae = mean_absolute_error(y_test, y_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    test_mape = mean_absolute_percentage_error(y_test, y_pred) * 100

    print(f"\n--- 2. Test Set Evaluation (80/20 Split) ---")
    print(f"Test R² Score:  {test_r2:.4f}")
    print(f"MAE (Fill Rate): {test_mae:.4f}")
    print(f"RMSE (Fill Rate): {test_rmse:.4f}")
    print(f"MAPE: {test_mape:.2f}%")

    # Convert to attendance numbers for a 15000 capacity stadium
    capacity_npl = 15000
    mae_attendance = test_mae * capacity_npl
    rmse_attendance = test_rmse * capacity_npl
    print(f"\nFor a {capacity_npl}-seat NPL stadium:")
    print(f"  MAE  = ±{mae_attendance:.0f} people")
    print(f"  RMSE = ±{rmse_attendance:.0f} people")

    # ─── 3. 5-Fold Cross Validation ───
    pipeline_cv = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10))
    ])
    cv_scores = cross_val_score(pipeline_cv, X, y_fill_rate, cv=5, scoring='r2')
    print(f"\n--- 3. 5-Fold Cross-Validation ---")
    print(f"Fold Scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"Mean R²: {cv_scores.mean():.4f} (±{cv_scores.std():.4f})")

    # ─── 4. Feature Importance ───
    importances = pipeline_full.named_steps['rf'].feature_importances_
    feat_imp = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
    print(f"\n--- 4. Feature Importance ---")
    for feat, imp in feat_imp:
        bar = '█' * int(imp * 50)
        print(f"  {feat:15s} {imp:.4f}  {bar}")

    # ─── 5. Prediction Sanity Check ───
    print(f"\n--- 5. Sample Predictions vs Actual (Test Set, first 10) ---")
    print(f"{'Actual Fill%':>14s} {'Predicted Fill%':>16s} {'Error':>8s}")
    for i in range(min(10, len(y_test))):
        actual = y_test.iloc[i] * 100
        predicted = y_pred[i] * 100
        error = abs(actual - predicted)
        print(f"  {actual:10.1f}%    {predicted:12.1f}%    {error:5.1f}%")

    print(f"\n{'=' * 60}")
    print("EVALUATION COMPLETE")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
