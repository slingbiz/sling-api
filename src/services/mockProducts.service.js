/**
 * Service to generate realistic fake product data
 * Replaces dependency on external fakestoreapi.com
 */

// Free image service: Picsum Photos (reliable placeholder images)
// Using specific image IDs for consistency and category-appropriate images
const PRODUCT_IMAGES = {
  "men's clothing": [
    'https://picsum.photos/id/1018/400/400', // Nature/outdoor gear
    'https://picsum.photos/id/1043/400/400', // Clothing/apparel
    'https://picsum.photos/id/1025/400/400', // Fashion
    'https://picsum.photos/id/1039/400/400', // Lifestyle
  ],
  "women's clothing": [
    'https://picsum.photos/id/1020/400/400', // Fashion
    'https://picsum.photos/id/1021/400/400', // Clothing
    'https://picsum.photos/id/1035/400/400', // Style
    'https://picsum.photos/id/1044/400/400', // Apparel
    'https://picsum.photos/id/1050/400/400', // Fashion
    'https://picsum.photos/id/1055/400/400', // Style
  ],
  electronics: [
    'https://picsum.photos/id/1/400/400', // Tech
    'https://picsum.photos/id/2/400/400', // Electronics
    'https://picsum.photos/id/3/400/400', // Gadgets
    'https://picsum.photos/id/4/400/400', // Devices
    'https://picsum.photos/id/5/400/400', // Technology
    'https://picsum.photos/id/6/400/400', // Hardware
  ],
  jewelery: [
    'https://picsum.photos/id/100/400/400', // Jewelry/luxury
    'https://picsum.photos/id/101/400/400', // Accessories
    'https://picsum.photos/id/102/400/400', // Fine jewelry
    'https://picsum.photos/id/103/400/400', // Gems
  ],
};

// Fallback to placeholder.com if Picsum fails (very reliable free service)
const getFallbackImage = (category) => {
  // Use placeholder.com which generates images with text
  const categoryMap = {
    "men's clothing": 'mens-clothing',
    "women's clothing": 'womens-clothing',
    electronics: 'electronics',
    jewelery: 'jewelry',
  };
  const categoryText = categoryMap[category] || 'product';
  // Placeholder.com - very reliable free service
  return `https://via.placeholder.com/400/CCCCCC/666666?text=${encodeURIComponent(categoryText)}`;
};

const generateMockProducts = () => {
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

  // Helper function to get image URL for a product
  const getImageUrl = (category, index) => {
    const categoryImages = PRODUCT_IMAGES[category] || [];
    // Use actual image URL if available, otherwise fallback to Unsplash
    return categoryImages[index % categoryImages.length] || getFallbackImage(category, index);
  };

  // Generate men's clothing products
  menClothing.forEach((product, index) => {
    products.push({
      id: id + index,
      title: product.title,
      price: product.price,
      description: product.description,
      category: "men's clothing",
      image: getImageUrl("men's clothing", index),
      rating: {
        rate: Number((Math.random() * 2 + 3).toFixed(1)),
        count: Math.floor(Math.random() * 400 + 100),
      },
    });
  });
  id += menClothing.length;

  // Generate women's clothing products
  womenClothing.forEach((product, index) => {
    products.push({
      id: id + index,
      title: product.title,
      price: product.price,
      description: product.description,
      category: "women's clothing",
      image: getImageUrl("women's clothing", index),
      rating: {
        rate: Number((Math.random() * 2 + 3).toFixed(1)),
        count: Math.floor(Math.random() * 400 + 100),
      },
    });
  });
  id += womenClothing.length;

  // Generate electronics products
  electronics.forEach((product, index) => {
    products.push({
      id: id + index,
      title: product.title,
      price: product.price,
      description: product.description,
      category: 'electronics',
      image: getImageUrl('electronics', index),
      rating: {
        rate: Number((Math.random() * 2 + 3).toFixed(1)),
        count: Math.floor(Math.random() * 400 + 100),
      },
    });
  });
  id += electronics.length;

  // Generate jewelry products
  jewelery.forEach((product, index) => {
    products.push({
      id: id + index,
      title: product.title,
      price: product.price,
      description: product.description,
      category: 'jewelery',
      image: getImageUrl('jewelery', index),
      rating: {
        rate: Number((Math.random() * 2 + 3).toFixed(1)),
        count: Math.floor(Math.random() * 400 + 100),
      },
    });
  });

  return products;
};

module.exports = {
  generateMockProducts,
};
