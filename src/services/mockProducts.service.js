/**
 * Service to generate realistic fake product data
 * Replaces dependency on external fakestoreapi.com
 */

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
        '3D NAND flash are applied to deliver high transfer speeds Remarkable transfer speeds that enable faster bootup and improved overall performance. The advanced SLC Cache Technology allows performance boost and longer lifespan',
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

  // Helper function to generate product-specific placeholder image with title and price
  // This ensures images always match the product because they display the product name
  const getImageUrl = (title, category, price) => {
    // Create a short product name for the image text (max 25 chars for readability)
    let imageText = title;
    if (imageText.length > 25) {
      // Use first few words + price
      const words = imageText.split(' ');
      imageText = `${words.slice(0, 3).join(' ')} $${price}`;
    } else {
      imageText = `${imageText} $${price}`;
    }

    // Color scheme based on category
    const categoryColors = {
      "men's clothing": { bg: '4A90E2', text: 'FFFFFF' }, // Blue
      "women's clothing": { bg: 'E91E63', text: 'FFFFFF' }, // Pink
      electronics: { bg: '607D8B', text: 'FFFFFF' }, // Blue Grey
      jewelery: { bg: 'FFD700', text: '000000' }, // Gold
    };

    const colors = categoryColors[category] || { bg: 'CCCCCC', text: '666666' };

    // Use placeholder.com with product name and price - always matches!
    return `https://via.placeholder.com/400/${colors.bg}/${colors.text}?text=${encodeURIComponent(imageText)}`;
  };

  const products = [];
  let id = 1;

  // Generate men's clothing products
  menClothing.forEach((product, index) => {
    products.push({
      id: id + index,
      title: product.title,
      price: product.price,
      description: product.description,
      category: "men's clothing",
      image: getImageUrl(product.title, "men's clothing", product.price),
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
      image: getImageUrl(product.title, "women's clothing", product.price),
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
      image: getImageUrl(product.title, 'electronics', product.price),
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
      image: getImageUrl(product.title, 'jewelery', product.price),
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
