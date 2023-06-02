/* eslint-disable */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2s', target: 1000 },
    { duration: '33s', target: 1500 },
    { duration: '1s', target: 0 },
  ],
};

export default () => {
  const reviewId = Math.floor(5000000 + Math.random() * 750000);
  const res = http.put(http.url`http://localhost:3000/reviews/${reviewId}/helpful`); // should be api reviews; need to update in frontend router
  check(res, {
    'is Status 204': (r) => r.status === 204,
  });
  // sleep(1);
}