/* eslint-disable */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2s', target: 1500 },
    { duration: '33s', target: 2000 },
    { duration: '1s', target: 0 },
  ],
};

export default () => {
  const productId = Math.floor(900000 + Math.random() * 100000);
  const res = http.get(http.url`http://localhost:3000/reviews?product_id=${productId}`); // should be api reviews; need to update in frontend router
  check(res, {
    'is Status 200': (r) => r.status === 200,
  });
  // sleep(1);
}