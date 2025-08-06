import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const app = express();
const port = 5000;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  const filePath = req.file.path;

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  try {
    const aiResponse = await axios.post('http://localhost:8000/match_face', formData, {
      headers: formData.getHeaders(),
    });

    res.json(aiResponse.data);
  } catch (err) {
    console.error(err);
    res.status(500).send('AI service error');
  }
});

app.listen(port, () => console.log(`Node.js API running at http://localhost:${port}`));


