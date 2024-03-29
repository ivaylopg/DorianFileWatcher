const fs = require('fs');
const chokidar = require('chokidar');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');
const FormData = require('form-data');
const path = require('path');


const jsonData = require('./watcherConfig.json');
// console.log(jsonData);

const watchFolder = jsonData["watchFolder"]; // Replace with the folder you want to watch

// Watch the folder for new WAV files
const watcher = chokidar.watch(watchFolder, 
  { ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    } 
  });



watcher.on('add', (path) => ConvertAndUpload(path))
watcher.on('change', (path) => ConvertAndUpload(path))



async function ConvertAndUpload(filePath) {
  if (filePath.endsWith('.wav')) {
    console.log(`Detected new or changed WAV file: ${filePath}`);

    let baseName = path.basename(filePath, path.extname(filePath));
    let destination = jsonData["dorianIps"][baseName]
    // console.log(baseName);
    console.log(destination);


    // Generate the output MP3 filename
    const mp3FilePath = filePath.replace('.wav', '.mp3');


    // Convert WAV to MP3 using ffmpeg
    const ffmpegCommand = `${ffmpegPath} -y -i "${filePath}" -codec:a libmp3lame -qscale:a 2 "${mp3FilePath}"`;

    try {
      // Execute the ffmpeg command
      await runCommand(ffmpegCommand);

      console.log(`Conversion successful. Uploading MP3 to server...`);

      // Read the MP3 file as a stream
      const formData = new FormData();
      // const mp3Stream = fs.createReadStream(mp3FilePath);
      formData.append('audioFile', fs.createReadStream(mp3FilePath));

      // Make a POST request to upload the MP3 file
      // const response = await axios.post(uploadUrl, mp3Stream, {
      //   headers: {
      //     'Content-Type': 'audio/mpeg',
      //   },
      // });
      console.log("Try Upload");
      axios.post(destination, formData, {
        headers: formData.getHeaders(),
      })
      .then(response => {
        console.log('Upload success:', response.data);
      })
      .catch(error => {
        console.error('Upload error:', error.message);
      })
      .finally(() => {
        try {
          // Clean up: Delete the local files
          fs.unlinkSync(mp3FilePath);
          fs.unlinkSync(filePath);
          console.log(`Local files deleted: ${filePath}, ${mp3FilePath}`);  
        } catch (error) {
          console.log(`Could not delete local file ${mp3FilePath}\n${error}`);
        }
        
      });

    } catch (error) {
      console.error(`Error converting or uploading:`, error.message);
    }
  }
};

watcher.on('error', (error) => {
  console.error(`Watcher error:`, error);
});

// Helper function to run a command as a Promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    const childProcess = require('child_process').exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        console.log("Command error!");
      } else {
        resolve();
        console.log("Command Completed");
      }
    });

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
  });
}
