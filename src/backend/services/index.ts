import mediaRouter from './media/controllers';
import staticRouter from './frontend/static';
import pagesRouter from './frontend/routes';

export const routers = [staticRouter, pagesRouter, mediaRouter];
