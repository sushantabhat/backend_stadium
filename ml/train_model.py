import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'Behavioral_Data.csv')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
PIPELINE_PATH = os.path.join(os.path.dirname(__file__), 'pipeline.pkl')

def train():
    print(f"Loading Synthetic NPL Dataset from {DATA_PATH}...")
    
    if not os.path.exists(DATA_PATH):
        print(f"Error: {DATA_PATH} not found. Please run generate_behavior_data.py first.")
        return
        
    df = pd.read_csv(DATA_PATH)
    
    # Categorical columns that need encoding
    categorical_features = ['match_stage', 'match_time']
    # Numeric/Binary columns that pass through
    numeric_features = [
        'stadium_capacity', 'team_a_tier', 'team_b_tier', 
        'has_team_rivalry', 'is_home_match', 'average_ticket_price',
        'is_weekend', 'is_holiday', 'max_temp', 'rain_mm'
    ]
    
    X = df[categorical_features + numeric_features]
    y = df['attendance']
    
    # Create the preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
            ('num', 'passthrough', numeric_features)
        ])
    
    # Combine preprocessor and model into a single pipeline
    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('model', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training 100% Synthetic NPL Pipeline...")
    pipeline.fit(X_train, y_train)
    
    predictions = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Evaluation:")
    print(f"Mean Absolute Error (MAE): {mae:.2f}")
    print(f"R-squared (R2) Score: {r2:.2f}")
    
    # Save the entire pipeline (handles encoding + predicting)
    joblib.dump(pipeline, PIPELINE_PATH)
    print(f"Synthetic NPL Pipeline successfully saved to {PIPELINE_PATH}")

if __name__ == '__main__':
    train()
