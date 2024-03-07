const fs = require('fs');
const chokidar = require('chokidar');
const axios = require('axios');
const ffmpegPath = require('ffmpeg-static');
const FormData = require('form-data');

const watchFolder = '/Users/ivaylopg/Desktop/DoriansOutput'; // Replace with the folder you want to watch
const uploadUrl = 'http://192.168.88.230:5000/upload'; // Replace with your server's upload URL

// Watch the folder for new WAV files
const watcher = chokidar.watch(watchFolder, { ignoreInitial: true });



watcher.on('add', (path) => ConvertAndUpload(path))
watcher.on('change', (path) => ConvertAndUpload(path))


async function ConvertAndUpload(filePath) {
  if (filePath.endsWith('.wav')) {
    console.log(`Detected new WAV file: ${filePath}`);

    // Generate the output MP3 filename
    const mp3FilePath = filePath.replace('.wav', '.mp3');

    // Convert WAV to MP3 using ffmpeg
    const ffmpegCommand = `${ffmpegPath} -i "${filePath}" -codec:a libmp3lame -qscale:a 2 "${mp3FilePath}"`;

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
      axios.post('http://192.168.88.230:5000/upload', formData, {
        headers: formData.getHeaders(),
      })
      .then(response => {
        console.log('Upload success:', response.data);
      })
      .catch(error => {
        console.error('Upload error:', error.message);
      })
      .finally(() => {
        // Clean up: Delete the local files
        fs.unlinkSync(mp3FilePath);
        // fs.unlinkSync(filePath);
        console.log(`Local files deleted: ${filePath}, ${mp3FilePath}`);
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
        console.log("Process Error");
      } else {
        resolve();
        console.log("ProcessDone");
      }
    });

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);
  });
}
