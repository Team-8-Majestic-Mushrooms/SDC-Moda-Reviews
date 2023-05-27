const db = require('../../database/db');

module.exports = {
  queryReviews: (productId, page = 1, count = 5, sort = 'relevant') => {
    const orderBy = {
      relevant: 'rating',
      newest: 'date',
      helpful: 'helpfulness',
    };

    const q = 'SELECT r.review_id, r.rating, r.summary, r.recommend, r.response, r.body, r.date, r.reviewer_name, r.helpfulness, p.photos FROM reviews r JOIN photos_agg p ON r.review_id = p.review_id WHERE product_id = $4 ORDER BY $3^ DESC LIMIT $2 OFFSET $1';

    return db.any(q, [(page - 1) * count, count, orderBy[sort], productId]);
  },
  queryMeta: (productId) => {
    const q = 'SELECT c.product_id::text, c.ratings, c.recommended, a.characteristics FROM count_rating_agg c JOIN avg_rating_agg a ON c.product_id = a.product_id WHERE c.product_id = $1';

    return db.one(q, [productId]);
  },
};