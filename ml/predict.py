import sys
import json
import joblib
import os
import pandas as pd
import traceback

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

def main():
    try:
        if not os.path.exists(MODEL_PATH):
            print(json.dumps({"error": "Model not found. Please train first."}))
            sys.exit(1)
            
        model = joblib.load(MODEL_PATH)
        
        # Read JSON from argument or stdin
        input_data = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
        
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        
        # Build the exact dataframe the model expects
        df = pd.DataFrame([{
            'stadium_capacity': float(data.get('stadium_capacity', 15000)),
            'expected_popularity': float(data.get('expected_popularity', 5)),
            'is_weekend': int(data.get('is_weekend', 0)),
            'is_holiday': int(data.get('is_holiday', 0)),
            'max_temp': float(data.get('max_temp', 22.0)),
            'rain_mm': float(data.get('rain_mm', 0.0))
        }])
        
        prediction = model.predict(df)[0]
        
        # Cap prediction at capacity
        capacity = float(data.get('stadium_capacity', 15000))
        if prediction > capacity:
            prediction = capacity
            
        print(json.dumps({
            "predicted_attendance": int(prediction),
            "features_used": {
                "stadium_capacity": int(capacity),
                "expected_popularity": int(data.get('expected_popularity', 5)),
                "match_type": data.get('match_type', 'League')
            }
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
        sys.exit(1)

if __name__ == "__main__":
    main()
