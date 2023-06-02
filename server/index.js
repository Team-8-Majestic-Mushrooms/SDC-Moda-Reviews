require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const controllers = require('./controllers');

const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.get('/reviews', controllers.getReviews);
app.post('/reviews', controllers.postReview);
app.get('/reviews/meta', controllers.getMeta);
app.put('/reviews/:review_id/helpful', controllers.putHelpful);
app.put('/reviews/:review_id/report', controllers.putReported);

// app.listen(process.env.PORT, () => {
//   console.log(`LISTENING ON PORT ${process.env.PORT}`);
// });

module.exports = app;
