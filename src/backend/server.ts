import atomix from '@nasriya/atomix';
import express from 'express';
import path from 'path';
import { routers } from './services/index';

const app = express();
const PORT = process.env.PORT || 5000;

for (const router of routers) {
    app.use(router);
}

const notFoundPath = path.join(
    __dirname,
    '../frontend/static/global/404/index.html'
);
app.use((_, res) => res.sendFile(notFoundPath));

const server = app.listen(5000, () => {
    const host = atomix.networks.local.getLocalIPs()[0] || 'localhost';
    console.log(`Server is now listening on port ${PORT}`);
    console.log(`=> http://${host}:${PORT}`);
});

export default server;
