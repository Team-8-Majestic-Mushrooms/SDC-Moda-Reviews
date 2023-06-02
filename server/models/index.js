const db = require('../../database/db');

module.exports = {
  queryReviews: (productId, page = 1, count = 5, sort = 'relevant') => {
    // console.log('DB Pool:', db.$pool);
    const orderBy = {
      relevant: 'rating',
      newest: 'date',
      helpful: 'helpfulness',
    };
    const q = 'SELECT r.review_id, r.rating, r.summary, r.recommend, r.response, r.body, r.date, r.reviewer_name, r.helpfulness, COALESCE(p.photos, $5::jsonb) AS photos FROM reviews r LEFT JOIN dynamic_photo_agg(r.review_id) p ON r.review_id = p.review_id WHERE product_id = $4 AND reported = false ORDER BY $3^ DESC LIMIT $2 OFFSET $1';
    return db.any(q, [(page - 1) * count, count, orderBy[sort], productId, '[]']);
  },
  queryMeta: (productId) => {
    const q = 'SELECT c.product_id::text, c.ratings, c.recommended, a.characteristics FROM dynamic_count_rating($1) c JOIN dynamic_avg_rating_agg($1) a USING (product_id)';

    return db.one(q, [productId]);
  },

  insertReview: (review) => {
    const reviewInsertQ = 'INSERT INTO reviews (product_id, rating, summary, body, recommend, reviewer_name, reviewer_email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING review_id';
    // const reviewIdQ = 'SELECT MAX(review_id) FROM reviews';
    let photosInsertQ = 'INSERT INTO photos (review_id, url) VALUES '; // update for multiline inserts
    let charReviewInsertQ = 'INSERT INTO characteristic_reviews (characteristic_id, review_id, value) VALUES '; // look at pgpromise docs for best way to handle multiline insert

    // add lines to insert. $1 is review_id
    if (review.photos.length > 0) {
      review.photos.forEach((photo, i, arr) => {
        photosInsertQ += `($1, $${i + 2})`;
        if (i !== arr.length - 1) {
          photosInsertQ += ', ';
        }
      });
    }

    // $1 is review_id
    const charVars = [];
    Object.keys(review.characteristics).forEach((charId, i, arr) => {
      charReviewInsertQ += `($${i * 2 + 2}, $1, $${i * 2 + 3})`;
      if (i !== arr.length - 1) {
        charReviewInsertQ += ', ';
      }
      charVars.push(charId);
      charVars.push(review.characteristics[charId]);
    });

    // console.log('Review Insert Query:', reviewInsertQ);
    // console.log('Photos Insert Query:', photosInsertQ);
    // console.log('Char Review Insert Query:', charReviewInsertQ);

    return db.tx((t) => t.one(
      reviewInsertQ,
      [
        review.product_id,
        review.rating,
        review.summary,
        review.body,
        review.recommend,
        review.name,
        review.email,
      ],
    )
      .then((data) => {
        const batch = [t.none(charReviewInsertQ, [data.review_id, ...charVars])];
        if (review.photos.length > 0) {
          batch.push(t.none(photosInsertQ, [data.review_id, ...review.photos]));
        }
        return t.batch(batch);
      }));
  },
  updateHelpfulness: (reviewId) => {
    const q = 'UPDATE reviews SET helpfulness = helpfulness + 1 WHERE review_id = $1';
    return db.none(q, [reviewId]);
  },
  updateReported: (reviewId) => {
    const q = 'UPDATE reviews SET reported = true WHERE review_id = $1';
    return db.none(q, [reviewId]);
  },
};

// newReview obj = {
//         product_id: product.id,
//         rating,
//         summary,
//         body,
//         recommend,
//         name,
//         email,
//         photos,
//         characteristics: charRatings,
//       }
