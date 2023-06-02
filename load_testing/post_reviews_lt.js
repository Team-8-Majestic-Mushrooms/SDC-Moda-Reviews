/* eslint-disable */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2s', target: 750 },
    { duration: '33s', target: 1000 },
    { duration: '1s', target: 0 },
  ],
};

const review = {
  product_id: undefined,
  rating: 3,
  summary: 'k6',
  body: 'Can you handle the heat?',
  recommend: false,
  name: 'Kevin Seis',
  email: 'k6@k6.io',
  photos: ["https://res.cloudinary.com/dlbnwlpoq/image/upload/v1685400007/kgl0f5fox9cstegcj4kt.jpg", "https://res.cloudinary.com/dlbnwlpoq/image/upload/v1685400007/kgl0f5fox9cstegcj4kt.jpg"],
  characteristics: { "135219": 2, "135220": 2, "135221": 2, "135222": 2 }
}

export default () => {
  review.product_id = Math.floor(900000 + Math.random() * 100000);
  // url should be api/reviews; need to update in frontend router
  const res = http.post(http.url`http://localhost:3000/reviews`, JSON.stringify(review), {
    headers: { 'Content-type': 'application/json' },
  });
  check(res, {
    'is Status 201': (r) => r.status === 201,
  });
  // sleep(1);
}