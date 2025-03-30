-- ~/this/create-products.sql
-- Final Schema based on CJ Google Shopping Feed Headers
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id TEXT PRIMARY KEY,                  -- Feed: ID (Advertiser's unique product ID/SKU)
  title TEXT NOT NULL,                  -- Feed: TITLE
  description TEXT,                     -- Feed: DESCRIPTION
  link TEXT NOT NULL,                   -- Feed: LINK (Should be CJ Affiliate Link)
  image_link TEXT,                    -- Feed: IMAGE_LINK
  availability TEXT,                    -- Feed: AVAILABILITY
  price TEXT,                           -- Feed: PRICE (Raw string e.g., "99.99 USD")
  sale_price TEXT,                      -- Feed: SALE_PRICE
  brand TEXT,                           -- Feed: BRAND
  gtin TEXT,                            -- Feed: GTIN (UPC, EAN, ISBN)
  mpn TEXT,                             -- Feed: MPN (Manufacturer Part Number)
  google_product_category TEXT,         -- Feed: GOOGLE_PRODUCT_CATEGORY (Usually the numeric ID)
  google_product_category_name TEXT,    -- Feed: GOOGLE_PRODUCT_CATEGORY_NAME (The category name string)
  product_type TEXT,                    -- Feed: PRODUCT_TYPE (Advertiser's category)
  condition TEXT,                       -- Feed: CONDITION
  adult TEXT,                           -- Feed: ADULT ('yes'/'no')
  item_group_id TEXT,                 -- Feed: ITEM_GROUP_ID (For product variants)
  advertiser_name TEXT,                 -- Feed: PROGRAM_NAME
  advertiser_url TEXT,                  -- Feed: PROGRAM_URL
  catalog_name TEXT,                    -- Feed: CATALOG_NAME
  last_updated_feed TEXT,               -- Feed: LAST_UPDATED (Timestamp from feed)
  currency TEXT,                        -- Derived from PRICE/SALE_PRICE
  numeric_price REAL,                   -- Derived numerical price for sorting/filtering
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- Import timestamp
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP  -- Import timestamp
  -- Skipping MOBILE_LINK, ADDITIONAL_IMAGE_LINK, complex shipping/tax, custom labels etc. for now
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_title ON products(title);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
CREATE INDEX IF NOT EXISTS idx_products_mpn ON products(mpn);
CREATE INDEX IF NOT EXISTS idx_products_google_category ON products(google_product_category);
CREATE INDEX IF NOT EXISTS idx_products_google_category_name ON products(google_product_category_name);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_advertiser_name ON products(advertiser_name);
CREATE INDEX IF NOT EXISTS idx_products_item_group_id ON products(item_group_id);
CREATE INDEX IF NOT EXISTS idx_products_numeric_price ON products(numeric_price); 