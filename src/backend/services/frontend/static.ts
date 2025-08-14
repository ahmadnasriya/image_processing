import express from 'express';
import path from 'path';

const staticRouter = express.Router();
const staticPath = path.join(__dirname, '../../../frontend/static');
staticRouter.use('/assets', express.static(staticPath));

export default staticRouter;
