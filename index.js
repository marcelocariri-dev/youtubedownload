const express = require("express");
const ytdl = require("@distube/ytdl-core");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const app = express();
const port = 5179;
const cors = require("cors");

app.use(cors());
app.use(express.json());

const downloadAudioFromYoutube = async (url, output) => {
  return new Promise((resolve, reject) => {
    try {
      if (!url) {
        throw new Error("URL inválida");
      }

      ytdl.getInfo(url).then(info => {
        console.log("Informações do vídeo:", info);

        if (!info.videoDetails || !info.videoDetails.title) {
          throw new Error("Informações do vídeo não encontradas");
        }

        const title = info.videoDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
        const outputFilePath = `${output}/${title}.mp3`;
        const audioStream = ytdl(url, { filter: 'audioonly' });

        audioStream.listeners('error').forEach((funcao) => {
          audioStream.removeListener('error', funcao);
        });

        ffmpeg(audioStream)
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('error', (err) => {
            console.error(`Error: ${err.message}`);
            reject(err); // Reject the promise on error
          })
          .on('end', () => {
            console.log(`Downloaded and converted to MP3: ${outputFilePath}`);
            resolve(); // Resolve the promise on successful end
          })
          .save(outputFilePath);
      }).catch(error => {
        console.error(`Error getting video info: ${error.message}`);
        reject(error); // Reject the promise if there is an error getting video info
      });
    } catch (error) {
      console.error(`Error downloading audio: ${error.message}`);
      reject(error); // Reject the promise on general error
    }
  });
};

app.get('/', (req, res) => {
  res.send('Servidor está em execução');
});

app.post('/downloads', async (req, res) => {
  console.log("Recebido:", req.body);

  try {
    const {link } = req.body;
    if (!link) {
      console.log("URL não fornecida na requisição");
      return res.status(400).json({ error: "URL é obrigatória" });
    }

    const outputDirectory = './downloads';
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
    }

    await downloadAudioFromYoutube(link, outputDirectory);
    res.status(200).json({ message: 'Download iniciado' });
  } catch (error) {
    console.error(`Erro no servidor: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
