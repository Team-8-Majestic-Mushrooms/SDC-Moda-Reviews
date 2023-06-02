const request = require('supertest');
const controllers = require('../controllers');
const models = require('../models');
const pgp = require('pg-promise')();
const app = require('..');

jest.mock('../controllers');
jest.mock('../models');

console.log('put Helpful', controllers.putHelpful());

describe('Reviews Routes', () => {
  let db;
  let connection;

  beforeAll((done) => {
    const cn = {
      host: process.env.HOST,
      port: process.env.PGPORT,
      database: process.env.DB,
      user: process.env.USER,
      max: 1,
      idleTimeoutMillis: 0,
    };
    db = pgp(cn);

    models.queryReviews.mockImplementation((productId, page = 1, count = 5, sort = 'relevant') => {
      // console.log('DB Pool in jest test:', db.$pool);
      const orderBy = {
        relevant: 'rating',
        newest: 'date',
        helpful: 'helpfulness',
      };
      const q = 'SELECT r.review_id, r.rating, r.summary, r.recommend, r.response, r.body, r.date, r.reviewer_name, r.helpfulness, COALESCE(p.photos, $5^::jsonb) FROM reviews r LEFT JOIN dynamic_photo_agg(r.review_id) p ON r.review_id = p.review_id WHERE product_id = $4 ORDER BY $3^ DESC LIMIT $2 OFFSET $1';
      return db.any(q, [(page - 1) * count, count, orderBy[sort], productId, '[]']);
    });

    controllers.getReviews.mockImplementation((req, res) => {
      // console.log('Query: in jest test', req.query);
      const {
        page, count, sort, product_id,
      } = req.query;
      models.queryReviews(product_id, page, count, sort)
        .then((results) => {
          const resObj = {
            product: product_id,
            page: (page - 1) * count || 0,
            count: Number(count) || 5,
            results,
          };
          res.status(200).json(resObj);
        })
        .catch((err) => {
          console.log('getReviews Error', err);
          res.sendStatus(500);
        });
    });

    app.get('/reviews', controllers.getReviews);
    connection = app.listen(3001);

    db.none('CREATE TEMPORARY TABLE reviews (LIKE reviews)')
      .then(() => {
        db.none(
          'INSERT INTO pg_temp.reviews (product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, review_id, helpfulness, reported) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [40344, 4, 'Test Review 1', 'This is a test review', true, 'lundo', 'lundo@lundo.dev', 5, 0, false],
        );
        done();
        console.log('Tables created');
      })
      .catch((err) => done(err));
  });

  afterAll((done) => {
    db.none('DROP TABLE IF EXISTS pg_temp.reviews')
      .then(() => {
        db.$pool.end();
        connection.close();
        console.log('Pool and connection closed');
        done();
      })
      .catch((err) => done(err));
  });

  describe('/GET reviews route', () => {
    it('should respond with a list of reviews', (done) => {
      request(app)
        .get('/reviews')
        .query({
          page: '1', count: '5', sort: 'relevant', product_id: '40344',
        })
        .expect(200)
        .then((res) => {
          const response = JSON.parse(res.text);
          expect(response.product).toBe('40344');
          done();
        })
        .catch((err) => done(err));
    });
  });

  describe('/PUT routes', () => {
    it('should increment the helpfulness column when a put request is sent to the helpful route', (done) => {
      db.any('SELECT * FROM reviews')
        .then((res) => {
          console.log('PUT route test SELECT', res);
          done();
        })
        .catch((err) => done(err));
    });
  });
});
