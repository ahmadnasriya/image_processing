import express from 'express';
import path from 'path';
import mediaManager from '../media/mediaManager';

const pagesPath = path.join(__dirname, '../../../frontend/static/pages');

const pagesRouter = express.Router();

pagesRouter.get('/', (_, res) => {
    res.sendFile(path.join(pagesPath, 'landing/index.html'));
});

pagesRouter.get('/editor/:id', (req, res, next) => {
    const mediaId = req.params.id;
    const mediaMeta = mediaManager.getMediaMeta(mediaId);
    if (!mediaMeta) {
        return next();
    }

    res.sendFile(path.join(pagesPath, 'editor/index.html'));
});

export default pagesRouter;
