import { Router } from 'express';
import FolderController from '../controllers/folder.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', FolderController.createFolder);
router.get('/:folderId', FolderController.getFolderContents);
router.put('/:folderId/rename', FolderController.renameFolder);
router.delete('/:folderId', FolderController.deleteFolder);

export default router;
