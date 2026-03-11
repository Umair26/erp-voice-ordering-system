const { exec } = require('child_process');
const path = require('path');

// Get absolute path to Python script
const pyScript = path.join(__dirname, 'build_faiss.py');

exec(`python3 "${pyScript}"`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing Python script: ${error.message}`);
    return;
  }
  if (stderr) console.error(`stderr: ${stderr}`);
  console.log(stdout);
});