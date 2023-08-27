const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();
const port = 3000;

const getServerIP = () => {
  const ifaces = os.networkInterfaces();
  for (const dev in ifaces) {
    const iface = ifaces[dev].filter((details) => details.family === 'IPv4' && details.internal === false);
    if (iface.length > 0) return iface[0].address;
  }
};

const serverIP = getServerIP();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <link href="https://vjs.zencdn.net/7.8.4/video-js.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
        <script src="https://vjs.zencdn.net/7.8.4/video.js"></script>
        <style>
          body {
            background: linear-gradient(to right, #12c2e9, #c471ed, #f64f59);
            color: #ffffff;
            font-family: 'Rubik', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          h1 {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: animate__animated animate__bounceInLeft;
          }
          #movieList {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          a {
            text-decoration: none;
            color: #ffffff;
            font-size: 1.5rem;
            margin: 0.5rem;
            padding: 0.5rem;
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
            animation: animate__animated animate__fadeInUp;
          }
          a:hover {
            color: #00bcd4;
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.1);
          }
        </style>
      </head>
      <body>
        <h1><i class="fas fa-film"></i> Hanna and Bake's Super Streamer</h1>
        <div id="movieList"></div>
        <div id="videoPlayer"></div>
        <script>
          fetch('/movies')
            .then(response => response.json())
            .then(data => {
              const movieDiv = document.getElementById('movieList');
              data.forEach(movie => {
                const movieLink = document.createElement('a');
                movieLink.href = '#';
                movieLink.innerHTML = \`<i class="fas fa-play-circle"></i> \${movie}\`;
                movieLink.addEventListener('click', function(e) {
                  e.preventDefault();
                  const videoPlayer = document.getElementById('videoPlayer');
                  videoPlayer.innerHTML = \`
                    <video id="my-video" class="video-js" controls preload="auto" width="640" height="264">
                      <source src="/movies/\${movie}" type="video/mp4">
                    </video>
                  \`;
                  videojs(document.getElementById('my-video'));
                });
                movieDiv.appendChild(movieLink);
              });
            });
        </script>
      </body>
    </html>
  `);
});

// List all playable movie files
app.get('/movies', (req, res) => {
  const directoryPath = '/Users/ninjai/Desktop';
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to read directory');
    }
    const movieFiles = files.filter(file => ['.mp4', '.mkv', '.webm', '.ogg'].includes(path.extname(file)));
    res.json(movieFiles);
  });
});

// Stream specific movie file
app.get('/movies/:filename', (req, res) => {
  const { filename } = req.params;
  if (filename.includes('..')) {
    return res.status(400).send('Invalid filename');
  }

  const filePath = path.join('/Users/ninjai/Desktop', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Your streaming code here
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const fileExtension = path.extname(filename).substring(1);
  const mimeTypes = {
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    ogg: 'video/ogg',
  };
  const contentType = mimeTypes[fileExtension] || 'video/mp4';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://${serverIP}:${port}/`);

});
