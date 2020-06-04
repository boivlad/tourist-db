import express from 'express';
import fs from 'fs';
import multer from 'multer';
import { connection } from '../database/connect';
import { tokenHelper } from '../functions';

const { isDirector } = tokenHelper;
const router = express.Router();
const uploadPath = 'public/uploads/images';
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadFile = multer({ storage }).array('preview');

const getHotels = async(req, res) => {
  const client = await connection('anonymous');
  const { rows } = await client.query('SELECT * FROM getHotels()');
  res.status(200).json({ hotels: rows });
};
const createHotel = async(req, res) => {
  if (!isDirector(req.headers.authorization)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }
  const client = await connection('director');

  uploadFile(req, res, async(err) => {
    if (err) {
      return res.status(403).json({ message: err });
    }
    const {
      title, description, rating, address,
    } = req.body;
    try {
      await client.query(`INSERT INTO Hotels (title, description, rating, address, preview) VALUES ('${title}', '${description}', '${rating}', '${address}', '${req.files[0].filename}' );`);
      return res.status(201).json({
        message: 'New hotel was created successfully',
      });
    } catch (e) {
      fs.unlinkSync(`${uploadPath}/${req.files[0].filename}`);
      if (e.code === '23505') {
        return res.status(409).json({ message: 'Same hotel already exist' });
      }
      return res.status(422).json({ message: e });
    }
  });
};

router.get('/hotels', getHotels);
router.post('/hotels', createHotel);
export default router;
