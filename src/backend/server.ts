import express from 'express';
import { routers } from './services/index';

const app = express();

for (const router of routers) {
    app.use(router);
}

app.use((req, res) =>
    res.status(404).json({ error: 'Not found', req: req.url })
);

const server = app.listen(5000, () => console.log('Server is running'));

export default server;
