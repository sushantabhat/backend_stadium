import sys
import json
import os
import joblib
import pandas as pd

PIPELINE_PATH = os.path.join(os.path.dirname(__file__), 'pipeline.pkl')

def predict():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        
        if not os.path.exists(PIPELINE_PATH):
            print(json.dumps({"error": f"Pipeline file not found at {PIPELINE_PATH}. Please run train_model.py"}))
            sys.exit(1)
            
        # Load the pipeline (handles both preprocessing and prediction)
        pipeline = joblib.load(PIPELINE_PATH)
        
        # Create a single-row DataFrame from the input data matching the required schema
        df = pd.DataFrame([{
            'stadium_capacity': data.get('stadium_capacity', 15000),
            'team_a_tier': data.get('team_a_tier', 2),
            'team_b_tier': data.get('team_b_tier', 2),
            'match_stage': data.get('match_stage', 'League Stage'),
            'has_team_rivalry': data.get('has_team_rivalry', 0),
            'is_home_match': data.get('is_home_match', 0),
            'match_time': data.get('match_time', 'Day'),
            'average_ticket_price': data.get('average_ticket_price', 500),
            'is_weekend': data.get('is_weekend', 0),
            'is_holiday': data.get('is_holiday', 0),
            'max_temp': data.get('max_temp', 25.0),
            'rain_mm': data.get('rain_mm', 0.0)
        }])
        
        # Predict
        prediction = pipeline.predict(df)[0]
        
        print(json.dumps({
            "predicted_attendance": int(prediction),
            "features_used": df.to_dict(orient='records')[0]
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    predict()
