const path = require('path');
const { spawn } = require('child_process');

const inputData = {
  stadium_capacity: 15000,
  expected_popularity: 5,
  is_weekend: 0,
  is_holiday: 0,
  max_temp: 22.0,
  rain_mm: 0.0
};

const scriptPath = path.join(__dirname, 'ml', 'predict.py');
const venvPython = path.join(__dirname, 'ml', 'venv', 'bin', 'python3');

const pythonProcess = spawn(venvPython, [scriptPath, JSON.stringify(inputData)]);

let result = '';
let errorStr = '';

pythonProcess.stdout.on('data', (data) => {
  result += data.toString();
});

pythonProcess.stderr.on('data', (data) => {
  errorStr += data.toString();
});

pythonProcess.on('close', (code) => {
  console.log("EXIT CODE:", code);
  console.log("RESULT STR:", result);
  console.log("ERROR STR:", errorStr);
  
  try {
    const parsed = JSON.parse(result);
    console.log("PARSED:", parsed);
  } catch(e) {
    console.log("JSON PARSE FAILED:", e.message);
  }
});
