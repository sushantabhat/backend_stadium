import sys
import json
import pickle
import pandas as pd
import os

def main():
    try:
        # Load the model
        model_path = os.path.join(os.path.dirname(__file__), 'models/universal_model.pkl')
        with open(model_path, 'rb') as f:
            pipeline = pickle.load(f)
            
        # Read JSON string from stdin
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({'error': 'No input data provided'}))
            sys.exit(1)
            
        data = json.loads(input_data)
        
        # Extract features
        home_tier = data.get('home_tier', 2)
        away_tier = data.get('away_tier', 2)
        capacity = data.get('capacity', 15000)
        temp = data.get('temperature', 15.0)
        rainfall = data.get('rainfall', 0.0)
        month = data.get('month', 5)
        day_of_week = data.get('day_of_week', 5) # Default Saturday
        
        # Create DataFrame
        df = pd.DataFrame([{
            'Home_Tier': home_tier,
            'Away_Tier': away_tier,
            'Capacity': capacity,
            'Temperature': temp,
            'Rainfall': rainfall,
            'Month': month,
            'DayOfWeek': day_of_week
        }])
        
        # Predict fill rate
        fill_rate = pipeline.predict(df)[0]
        
        # Calculate final attendance
        predicted_attendance = int(fill_rate * capacity)
        
        # Ensure it doesn't exceed capacity
        predicted_attendance = min(predicted_attendance, capacity)
        
        print(json.dumps({
            'attendance': predicted_attendance,
            'fill_rate': fill_rate,
            'capacity': capacity
        }))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
