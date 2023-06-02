-- Drop tables if exist
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS characteristics CASCADE;
DROP TABLE IF EXISTS characteristic_reviews;

-- Products
CREATE TABLE products (
  id serial primary key,
  name text,
  slogan text,
  description text,
  category text,
  default_price int
);

\copy products from '../SDC_Data/product.csv' with csv header;

-- Reviews
CREATE TABLE reviews (
  review_id serial primary key,
  product_id int references products(id),
  rating int,
  date bigint default extract(epoch from now()) * 1000,
  summary text,
  body text,
  recommend boolean default false,
  reported boolean default false,
  reviewer_name text,
  reviewer_email text,
  response text default null,
  helpfulness int default 0
);

\copy reviews from '../SDC_Data/reviews.csv' with csv header;

CREATE INDEX r_idx_product_id ON reviews(product_id);
SELECT setval('reviews_review_id_seq'::regclass, COALESCE((SELECT MAX(review_id) + 1 FROM reviews), 1), false);

-- Dynamic View for meta counts
CREATE OR REPLACE FUNCTION dynamic_count_rating(input_param INTEGER)
  RETURNS TABLE (product_id INTEGER, ratings JSONB, recommended JSONB) AS
$$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT product_id,
      JSONB_BUILD_OBJECT(
      %L, COUNT(rating) FILTER (WHERE rating = 1)::text,
      %L, COUNT(rating) FILTER (WHERE rating = 2)::text,
      %L, COUNT(rating) FILTER (WHERE rating = 3)::text,
      %L, COUNT(rating) FILTER (WHERE rating = 4)::text,
      %L, COUNT(rating) FILTER (WHERE rating = 5)::text
      ) AS ratings,
      JSONB_BUILD_OBJECT(
        %L, COUNT(recommend) FILTER (WHERE recommend = false)::text,
        %L, COUNT(recommend) FILTER (WHERE recommend = true)::text
      ) AS recommended
    FROM reviews
    WHERE product_id = %s
    GROUP BY product_id;
  ', '1', '2', '3', '4', '5', 'false', 'true', input_param);
END;
$$
LANGUAGE plpgsql;

-- Photos
CREATE TABLE photos(
  id serial primary key,
  review_id int references reviews(review_id),
  url text
);

\copy photos from '../SDC_Data/reviews_photos.csv' with csv header;

CREATE INDEX idx_review_id ON photos(review_id);
SELECT setval('photos_id_seq'::regclass, COALESCE((SELECT MAX(id) + 1 FROM photos), 1), false);

-- dynamic photo_agg function
CREATE OR REPLACE FUNCTION dynamic_photo_agg(input_param INTEGER)
  RETURNS TABLE (review_id INTEGER, photos JSONB) AS
$$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
      review_id,
      jsonb_agg(jsonb_build_object(%L, id, %L, url))
      AS photos
    FROM photos
    WHERE review_id = %s
    GROUP BY review_id;', 'id', 'url', input_param);
END;
$$
LANGUAGE plpgsql;

-- Characteristics
CREATE TABLE characteristics (
  id serial primary key,
  product_id int references products(id),
  name text
);

\copy characteristics from '../SDC_Data/characteristics.csv' with csv header;

CREATE INDEX ch_idx_product_id ON characteristics(product_id);
SELECT setval('characteristics_id_seq'::regclass, COALESCE((SELECT MAX(id) + 1 FROM characteristics), 1), false);

-- Characteristic_Reviews
CREATE TABLE characteristic_reviews(
  id serial primary key,
  characteristic_id int references characteristics(id),
  review_id int references reviews(review_id),
  value int
);

\copy characteristic_reviews from '../SDC_Data/characteristic_reviews.csv' with csv header;

SELECT setval('characteristic_reviews_id_seq'::regclass, COALESCE((SELECT MAX(id) + 1 FROM characteristic_reviews), 1), false);
CREATE INDEX idx_char_id ON characteristic_reviews(characteristic_id);

-- Dynamice avg rating by product_id
CREATE OR REPLACE FUNCTION dynamic_avg_rating(input_param INTEGER)
  RETURNS TABLE (id INTEGER, product_id INTEGER, name TEXT, avg_value DECIMAL) AS
$$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
    c.id as id,
    c.product_id,
    c.name,
    AVG(cr.value) avg_value
    FROM characteristics c JOIN characteristic_reviews cr ON c.id = cr.characteristic_id
    WHERE c.product_id = %s
    GROUP BY c.product_id, c.id, c.name;', input_param);
END;
$$
LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION dynamic_avg_rating_agg(input_param INTEGER)
  RETURNS TABLE (product_id INTEGER, characteristics JSONB) AS
$$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT
    product_id,
    JSONB_OBJECT_AGG(
      name,
      JSONB_BUILD_OBJECT(
      %L, id,
      %L, avg_value::text
    )) characteristics
    FROM dynamic_avg_rating(%s)
    GROUP BY product_id;
  ', 'id', 'value', input_param);
END;
$$
LANGUAGE plpgsql;



-- SELECT
--   product_id,
--   JSONB_OBJECT_AGG(
--     name,
--     JSONB_BUILD_OBJECT(
--     'id', id,
--     'value', avg_value::text
--   )) characteristics
-- FROM generate_dynamic_view(56788)
-- GROUP BY product_id;


--  average rating view
-- CREATE VIEW avg_rating AS
-- SELECT
--   c.id as id,
--   c.product_id,
--   c.name,
--   AVG(cr.value) avg_value
-- FROM characteristics c JOIN characteristic_reviews cr ON c.id = cr.characteristic_id
-- GROUP BY c.product_id, c.id, c.name;

--- Materialized View for meta Average Ratings
-- CREATE MATERIALIZED VIEW avg_rating_agg AS
-- SELECT
--   product_id,
--   JSONB_OBJECT_AGG(
--     name,
--     JSONB_BUILD_OBJECT(
--     'id', avg_rating.id,
--     'value', avg_value::text
--   )) characteristics
-- FROM avg_rating
-- GROUP BY product_id;

-- CREATE INDEX avg_idx_product_id ON avg_rating_agg(product_id);

-- /reviews query
-- SELECT * FROM reviews r JOIN photos_agg p ON r.review_id = p.review_id WHERE product_id = 40350;

-- meta query
-- SELECT * FROM count_rating_agg c JOIN avg_rating_agg a ON c.product_id = a.product_id WHERE c.product_id = 40350;
