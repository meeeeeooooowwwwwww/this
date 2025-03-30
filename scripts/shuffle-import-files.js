const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Use asynchronous exec

const SQL_DIR = path.join(__dirname, '..', 'sql-imports');
const NUM_FILES_TO_IMPORT = 50; // Number of files for the free tier (~250k products)
const DB_NAME = 'nataliewinters-db'; // <<< Using the actual DB name directly

console.log(`--- Preparing and Asynchronously Executing Randomized D1 Import ---`);
console.log(`Target Database: ${DB_NAME}`);

// Helper function to run wrangler commands asynchronously
function runWranglerAsync(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    const startTime = Date.now();
    const wranglerProcess = exec(command, (error, stdout, stderr) => {
      const duration = (Date.now() - startTime) / 1000;
      if (error) {
        console.error(`-------------------------------------------`);
        console.error(`ERROR after ${duration.toFixed(1)}s executing command: ${command}`);
        console.error(`Status Code: ${error.code}`);
        if (stderr) {
            console.error(`Stderr:`);
            console.error(stderr); // Log full stderr
        }
        if (stdout) {
            console.error(`Stdout:`);
            console.error(stdout); // Log stdout too, might contain info
        }
        console.error(`-------------------------------------------`);
        resolve(false); // Resolve with false on error to allow loop to continue
      } else {
        console.log(`Command successful after ${duration.toFixed(1)}s.`);
        // Optionally log stdout for successful commands too if needed
        // if (stdout) { console.log(`Stdout:\n${stdout}`); }
        resolve(true);
      }
    });

    // Optionally pipe child process output to main process output in real-time
    // wranglerProcess.stdout.pipe(process.stdout);
    // wranglerProcess.stderr.pipe(process.stderr);
  });
}

// Main async function to orchestrate the import
async function runImport() {
  // 1. List SQL files
  try {
    const allFiles = fs.readdirSync(SQL_DIR);
    const importFiles = allFiles
      .filter(f => f.match(/^\d{3,}-import-products\.sql$/)) // Allow more than 3 digits now
      .sort();

    if (importFiles.length === 0) {
      console.error(`Error: No import files found in ${SQL_DIR}. Did you run prepare-d1-import.js?`);
      process.exit(1);
    }
    console.log(`Found ${importFiles.length} total import files.`);

    // 2. Shuffle
    for (let i = importFiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [importFiles[i], importFiles[j]] = [importFiles[j], importFiles[i]];
    }
    console.log(`Shuffled file order.`);

    // 3. Select files
    const filesToImport = importFiles.slice(0, NUM_FILES_TO_IMPORT);
    console.log(`Selected ${filesToImport.length} random files for import.`);

    // 4. Execute create table command
    console.log(`\n--- Step 1: Creating Table and Indexes (if they don't exist) ---`);
    const createTablePath = path.join('sql-imports', '000-create-table.sql');
    const createTableCommand = `npx wrangler d1 execute ${DB_NAME} --remote --yes --file=${createTablePath}`;
    const createSuccess = await runWranglerAsync(createTableCommand);
    if (!createSuccess) {
      console.error('Failed to execute create table command. Aborting import.');
      process.exit(1);
    }

    // 5. Execute import commands sequentially using await
    console.log(`\n--- Step 2: Importing ${filesToImport.length} Randomized Data Files ---`);
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < filesToImport.length; i++) {
      const file = filesToImport[i];
      const filePath = path.join('sql-imports', file);
      const importCommand = `npx wrangler d1 execute ${DB_NAME} --remote --yes --file=${filePath}`;
      console.log(`\n[${i + 1}/${filesToImport.length}] Attempting import for ${file}...`);
      
      const success = await runWranglerAsync(importCommand);
      
      if (success) {
        successCount++;
      } else {
        errorCount++;
        console.warn(`[${i + 1}/${filesToImport.length}] Skipped file ${file} due to error.`);
      }
      // Optional small delay
      // await new Promise(resolve => setTimeout(resolve, 200)); // e.g., 200ms delay
    }

    console.log(`\n--- Import Summary ---`);
    console.log(`Successfully imported files: ${successCount}`);
    console.log(`Failed/Skipped files: ${errorCount}`);
    console.log(`Check the final product count in the database.`);

  } catch (error) {
    console.error(`Error during import process:`, error);
    process.exit(1);
  }
}

// Run the main async function
runImport(); 