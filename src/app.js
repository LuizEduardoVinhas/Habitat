import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import databaseReady from './database/index.js';
import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import viewRoutes from './routes/viewRoutes.js';
import { helpers } from './utils/view-helpers.js';
import site from './config/site.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class App {
  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
    this.errors();
  }

  middlewares() {
    const sessionSecret = process.env.SESSION_SECRET || process.env.APP_SECRET;
    if (process.env.NODE_ENV === 'production' && (!sessionSecret || sessionSecret.length < 32)) {
      throw new Error('Configure SESSION_SECRET com pelo menos 32 caracteres em produção.');
    }

    // Motor de visualização (EJS) + helpers disponíveis em todas as views
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
    Object.assign(this.app.locals, helpers, { site });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, '../public')));

    this.app.use(session({
      secret: sessionSecret || 'minhachavesecretaultrasegura123',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,               // true em produção (HTTPS)
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }));

    // `user` disponível em todas as views (null quando não há sessão)
    this.app.use((req, res, next) => {
      res.locals.user = req.session?.user || null;
      next();
    });
  }

  routes() {
    this.app.use(viewRoutes);
    this.app.use(authRoutes);
    this.app.use(appRoutes);
    this.app.get('/health', (req, res) => res.status(200).json({
      status: 'OK',
      message: 'Servidor Habitat rodando perfeitamente!',
      timestamp: new Date(),
    }));
  }

  errors() {
    this.app.use((req, res) => res.status(404).render('error', { code: 404, message: 'Página não encontrada.' }));
    // eslint-disable-next-line no-unused-vars
    this.app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).render('error', { code: 500, message: 'Algo deu errado. Tente novamente em instantes.' });
    });
  }
}

const app = new App().app;
const port = Number(process.env.PORT || 3000);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await databaseReady;
    app.listen(port, () => {
      console.log(`Servidor Habitat rodando em http://localhost:${port}`);
    });
  } catch {
    process.exitCode = 1;
  }
}

export default app;
