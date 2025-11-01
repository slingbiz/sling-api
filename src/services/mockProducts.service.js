/**
 * Service to generate realistic fake product data
 * Replaces dependency on external fakestoreapi.com
 * Uses Unsplash API for product images with caching
 */

const axios = require('axios');
const { getDb } = require('../utils/mongoInit');
const logger = require('../config/logger');
const config = require('../config/config');

// Fallback: Use placeholder.com with product category text
const getFallbackImage = (category, productTitle) => {
  const shortTitle = productTitle.split(' ').slice(0, 3).join(' ').substring(0, 30);
  const categoryColors = {
    "men's clothing": { bg: '2E7D32', text: 'FFFFFF' }, // Green
    "women's clothing": { bg: 'C2185B', text: 'FFFFFF' }, // Pink
    electronics: { bg: '1976D2', text: 'FFFFFF' }, // Blue
    jewelery: { bg: 'F57C00', text: 'FFFFFF' }, // Orange
  };
  const colors = categoryColors[category] || { bg: '9E9E9E', text: 'FFFFFF' };
  // Placeholder.com - reliable free service with text
  return `https://via.placeholder.com/400/${colors.bg}/${colors.text}?text=${encodeURIComponent(shortTitle)}`;
};

/**
 * Fetch product image from Unsplash API or cache
 * @param {string} category - Product category
 * @param {string} productTitle - Product title for search
 * @param {number} productId - Product ID for caching
 * @returns {Promise<string>} Image URL
 */
const getProductImage = async (category, productTitle, productId) => {
  const db = getDb();

  // If no database connection, use fallback
  if (!db) {
    logger.warn(`[getProductImage] Database not available, using fallback for product ${productId}`);
    return getFallbackImage(category, productTitle);
  }

  // Create cache key from product title
  const cacheKey = `product_image_${productId}_${category}_${productTitle}`.replace(/[^a-zA-Z0-9_]/g, '_');

  try {
    // Check cache first
    const cached = await db.collection('product_image_cache').findOne({ cache_key: cacheKey });

    if (cached && cached.image_url) {
      logger.info(`[getProductImage] Using cached image for product ${productId} (${productTitle})`);
      return cached.image_url;
    }

    // If Unsplash keys are not configured, use fallback
    if (!config.unsplash || !config.unsplash.accessKey) {
      logger.warn(`[getProductImage] Unsplash not configured, using fallback for product ${productId}`);
      const fallbackUrl = getFallbackImage(category, productTitle);
      // Cache the fallback for consistency
      await db.collection('product_image_cache').updateOne(
        { cache_key: cacheKey },
        {
          $set: {
            cache_key: cacheKey,
            product_id: productId,
            product_title: productTitle,
            category,
            image_url: fallbackUrl,
            source: 'fallback',
            cached_at: new Date(),
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
      return fallbackUrl;
    }

    // Build search query from product title and category
    const searchQuery = `${productTitle} ${category}`.substring(0, 100);
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      searchQuery
    )}&per_page=1&client_id=${config.unsplash.accessKey}`;

    logger.info(`[getProductImage] Fetching image from Unsplash for product ${productId}: ${searchQuery}`);

    // Fetch from Unsplash API
    const response = await axios.get(unsplashUrl, {
      headers: {
        Authorization: `Client-ID ${config.unsplash.accessKey}`,
      },
      timeout: 10000, // 10 second timeout
    });

    // Extract image URL (use regular size, ~1080px width)
    let imageUrl = null;
    if (response.data && response.data.results && response.data.results.length > 0) {
      const photo = response.data.results[0];
      // Use regular size (1080px width) for good quality
      imageUrl = photo.urls?.regular || photo.urls?.small || photo.urls?.thumb;
    }

    if (!imageUrl) {
      logger.warn(`[getProductImage] No image found from Unsplash for product ${productId}, using fallback`);
      imageUrl = getFallbackImage(category, productTitle);
    } else {
      logger.info(`[getProductImage] Successfully fetched Unsplash image for product ${productId}`);
    }

    // Cache the image URL
    await db.collection('product_image_cache').updateOne(
      { cache_key: cacheKey },
      {
        $set: {
          cache_key: cacheKey,
          product_id: productId,
          product_title: productTitle,
          category,
          image_url: imageUrl,
          source: imageUrl.includes('placeholder.com') ? 'fallback' : 'unsplash',
          cached_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true }
    );

    return imageUrl;
  } catch (error) {
    // Log error but return fallback
    logger.error(`[getProductImage] Error fetching image for product ${productId}: ${error.message}`);
    const fallbackUrl = getFallbackImage(category, productTitle);

    // Try to cache the fallback even on error
    try {
      await db.collection('product_image_cache').updateOne(
        { cache_key: cacheKey },
        {
          $set: {
            cache_key: cacheKey,
            product_id: productId,
            product_title: productTitle,
            category,
            image_url: fallbackUrl,
            source: 'fallback',
            error: error.message,
            cached_at: new Date(),
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (cacheError) {
      logger.error(`[getProductImage] Failed to cache fallback image: ${cacheError.message}`);
    }

    return fallbackUrl;
  }
};

const generateMockProducts = async () => {
  const menClothing = [
    {
      title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
      price: 109.95,
      description:
        'Your perfect pack for everyday use and walks in the forest. Stash your laptop (up to 15 inches) in the padded sleeve, your everyday',
    },
    {
      title: 'Mens Casual Premium Slim Fit T-Shirts',
      price: 22.3,
      description:
        'Slim-fitting style, contrast raglan long sleeve, three-button henley placket, light weight and soft fabric for breathable and comfortable wearing. And Solid stitched shirts with round neck made for durability and a great fit for casual fashion wear and diehard baseball fans. The Henley style round neckline includes a three-button placket.',
    },
    {
      title: 'Mens Cotton Jacket',
      price: 55.99,
      description:
        'great outerwear jackets for Spring/Autumn/Winter, suitable for many occasions, such as working, hiking, camping, mountain/rock climbing, cycling, traveling or other outdoors. Good gift choice for you or your family member. A warm hearted love to Father, husband or son in this thanksgiving or Christmas Day.',
    },
    {
      title: 'Mens Casual Slim Fit',
      price: 15.99,
      description:
        'The color could be slightly different between on the screen and in practice. / Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description.',
    },
  ];

  const womenClothing = [
    {
      title: "BIYLACLESEN Women's 3-in-1 Snowboard Jacket Winter Coats",
      price: 56.99,
      description:
        'Note: The Jackets is US standard size. Please note that body builds vary by person, therefore, detailed size information should be reviewed below on the product description. Material: 100% Polyester. Detachable Liner Fabric: Warm Fleece.',
    },
    {
      title: "Lock and Love Women's Removable Hooded Faux Leather Moto Biker Jacket",
      price: 29.95,
      description:
        '100% POLYURETHANE(shell) 100% POLYESTER(lining) 75% POLYESTER 25% COTTON (SWEATER), Faux leather material for style and comfort / 2 pockets of front',
    },
    {
      title: 'Rain Jacket Women Windbreaker Striped Climbing Raincoats',
      price: 39.99,
      description:
        'Lightweight perfet for trip or casual wear---Long sleeve with hooded, adjustable drawstring waist design. Button and zipper front closure raincoat, fully stripes Lined',
    },
    {
      title: "MBJ Women's Solid Short Sleeve Boat Neck V",
      price: 9.85,
      description:
        '95% RAYON 5% SPANDEX, Made in USA or Imported, Do Not Bleach, Lightweight fabric with great stretch for comfort, Ribbed on sleeves and neckline / Double stitching on bottom hem',
    },
    {
      title: "Opna Women's Short Sleeve Moisture",
      price: 7.95,
      description:
        '100% Polyester, Machine wash, 100% cationic polyester interlock, Machine Wash & Pre Shrunk for a Great Fit, Lightweight fabric with great stretch for comfort',
    },
    {
      title: 'DANVOUY Womens T Shirt Casual Cotton Short',
      price: 12.99,
      description:
        '95%Cotton,5%Spandex, Features: Casual, Short Sleeve, Letter Print,V-Neck,Fashion Tees, The fabric is soft and has some stretch., Occasion: Casual/Office/Beach/School/Home/Street.',
    },
  ];

  const electronics = [
    {
      title: 'WD 2TB Elements Portable External Hard Drive - USB 3.0',
      price: 64,
      description:
        'USB 3.0 and USB 2.0 Compatibility Fast data transfers Improve PC Performance High Capacity; Compatibility Formatted NTFS for Windows 10, Windows 8.1, Windows 7',
    },
    {
      title: 'SanDisk SSD PLUS 1TB Internal SSD - SATA III 6 Gb/s',
      price: 109,
      description:
        'Easy upgrade for faster boot up, shutdown, application load and response. As compared to 5400 RPM SATA 2.5 hard drive. Based on published specifications and internal benchmarking tests using PCMark vantage scores.',
    },
    {
      title: 'Silicon Power 256GB SSD 3D NAND A55 SLC Cache Performance Boost SATA III 2.5',
      price: 109,
      description:
        '3D NAND flash are applied to deliver high transfer speeds Remarkable transfer speeds that enable faster bootup and improved overall system performance. The advanced SLC Cache Technology allows performance boost and longer lifespan',
    },
    {
      title: 'WD 4TB Gaming Drive Works with Playstation 4 Portable External Hard Drive',
      price: 114,
      description:
        "Expand your PS4 gaming experience, Play anywhere Fast and easy, setup Sleek design with high capacity, 3-year manufacturer's limited warranty",
    },
    {
      title: 'Acer SB220Q bi 21.5 inches Full HD (1920 x 1080) IPS Ultra-Thin',
      price: 599,
      description:
        '21. 5 inches Full HD (1920 x 1080) widescreen IPS display And Radeon free Sync technology. No compatibility for VESA Mount Refresh Rate: 75Hz - Using HDMI port',
    },
    {
      title: 'Samsung 49-Inch CHG90 144Hz Curved Gaming Monitor (LC49HG90DMNXZA) – Super Ultrawide Screen QLED',
      price: 999.99,
      description:
        '49 INCH SUPER ULTRAWIDE 32:9 CURVED GAMING MONITOR with dual 27 inch screen side by side QUANTUM DOT (QLED) TECHNOLOGY, HDR support and factory calibration provides stunningly realistic and accurate color and contrast',
    },
  ];

  const jewelery = [
    {
      title: "John Hardy Women's Legends Naga Gold & Silver Dragon Station Chain Bracelet",
      price: 695,
      description:
        "From our Legends Collection, the Naga was inspired by the mythical water dragon that protects the ocean's pearl. Wear facing inward to be bestowed with love and abundance, or outward for protection.",
    },
    {
      title: 'Solid Gold Petite Micropave',
      price: 168,
      description:
        'Satisfaction Guaranteed. Return or exchange any order within 30 days.Designed and sold by Hafeez Center in the United States. Satisfaction Guaranteed. Return or exchange any order within 30 days.',
    },
    {
      title: 'White Gold Plated Princess',
      price: 9.99,
      description:
        "Classic Created Wedding Engagement Solitaire Diamond Promise Ring for Her. Gifts to spoil your love more for Engagement, Wedding, Anniversary, Valentine's Day...",
    },
    {
      title: 'Pierced Owl Rose Gold Plated Stainless Steel Double',
      price: 10.99,
      description: 'Rose Gold Plated Double Flared Tunnel Plug Earrings. Made of 316L Stainless Steel',
    },
  ];

  const products = [];
  let id = 1;

  // Helper function to generate products with images
  const generateProductsWithImages = async (productList, category, startId) => {
    // Fetch all images in parallel for better performance
    const productPromises = productList.map(async (product, index) => {
      const productId = startId + index;
      const imageUrl = await getProductImage(category, product.title, productId);
      return {
        id: productId,
        title: product.title,
        price: product.price,
        description: product.description,
        category,
        image: imageUrl,
        rating: {
          rate: Number((Math.random() * 2 + 3).toFixed(1)),
          count: Math.floor(Math.random() * 400 + 100),
        },
      };
    });

    return Promise.all(productPromises);
  };

  // Generate men's clothing products
  const menProducts = await generateProductsWithImages(menClothing, "men's clothing", id);
  products.push(...menProducts);
  id += menClothing.length;

  // Generate women's clothing products
  const womenProducts = await generateProductsWithImages(womenClothing, "women's clothing", id);
  products.push(...womenProducts);
  id += womenClothing.length;

  // Generate electronics products
  const electronicsProducts = await generateProductsWithImages(electronics, 'electronics', id);
  products.push(...electronicsProducts);
  id += electronics.length;

  // Generate jewelry products
  const jewelryProducts = await generateProductsWithImages(jewelery, 'jewelery', id);
  products.push(...jewelryProducts);

  return products;
};

module.exports = {
  generateMockProducts,
};
