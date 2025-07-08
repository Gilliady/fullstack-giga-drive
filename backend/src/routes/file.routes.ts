import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import multer from 'multer';
import FileController from '../controllers/file.controller';
import { GCSService } from '../services/gcs.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

router.use(authMiddleware);
router.post('/upload', upload.array('files'), FileController.uploadFile);
router.get('/:fileId', FileController.getFile);
router.delete('/:fileId', FileController.deleteFile);
router.put('/:fileId/rename', FileController.renameFile);
router.put('/:fileId/move', FileController.moveFile);

export const fileRoutes = router;
