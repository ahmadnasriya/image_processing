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

const server = app.listen(PORT, () => {
    console.log(
        `🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`
    );
    console.log(`🌐 Listening on http://localhost:${PORT}`);
    console.log(`📂 Available endpoints:`);
    console.log(`   POST   /_api/v1/media          -> Upload an image`);
    console.log(
        `   GET    /_api/v1/media/:id      -> Access or transform an image`
    );
    console.log(
        `   GET    /_api/v1/media/:id/meta -> Get metadata of an image`
    );
});

export default server;
