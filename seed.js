const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Product = require("./models/Product");

dotenv.config();

const products = [
  { name: "Shea Butter Lotion",  description: "Rich and creamy body lotion made with pure shea butter.", price: 800,  category: "Lotion", images: ["/images/sheabutter.jpg"],   stock: 20, isFeatured: true  },
  { name: "Cocoa Butter Lotion", description: "Deep moisture cocoa butter lotion.",                        price: 800,  category: "Lotion", images: ["/images/cocoa.jpg"],        stock: 18, isFeatured: true  },
  { name: "Sweet Almond Lotion", description: "Nourishing sweet almond body lotion.",                      price: 800,  category: "Lotion", images: ["/images/almond.jpg"],       stock: 15, isFeatured: false },
  { name: "Cocoa Butter Soap",   description: "Calming and natural soap bar.",                              price: 400,  category: "Soap",   images: ["/images/soap.jpg"],         stock: 50, isFeatured: false },
  { name: "Lela Body Scrub",     description: "Brightening body scrub with natural ingredients.",           price: 750,  category: "Soap",   images: ["/images/scrub.jpg"],        stock: 25, isFeatured: false },
  { name: "Raw Shea Butter",     description: "Pure unrefined shea butter straight from the source.",        price: 700,  category: "Lotion", images: ["/images/butter.jpg"],       stock: 22, isFeatured: false },
  { name: "Lela Shampoo",        description: "Organic hair shampoo for healthy hair.",                      price: 700,  category: "Hair",   images: ["/images/shampoos.jpg"],     stock: 20, isFeatured: true  },
  { name: "Lela Conditioner",    description: "Nourishing hair conditioner.",                                price: 1200, category: "Hair",   images: ["/images/conditioners.jpg"], stock: 15, isFeatured: true  },
  { name: "Deep Conditioner",    description: "Deep conditioning treatment, 100% organic.",                  price: 650,  category: "Hair",   images: ["/images/dconditioner.jpg"], stock: 30, isFeatured: false },
  { name: "Hair Pomade",         description: "100% organic hair pomade.",                                   price: 350,  category: "Hair",   images: ["/images/pomade.jpg"],       stock: 50, isFeatured: false },
  { name: "Hair Spritz",         description: "Daily use hair spritz for moisture.",                         price: 750,  category: "Hair",   images: ["/images/ospritz.jpg"],      stock: 25, isFeatured: false },
  { name: "Rosehip Seed Oil",    description: "Nourishing rosehip seed oil.",                                price: 700,  category: "Hair",   images: ["/images/rosehip.jpg"],      stock: 12, isFeatured: false },
  { name: "Rose Water",          description: "Pure rosewater toner.",                                       price: 900,  category: "Lotion", images: ["/images/water.jpg"],        stock: 18, isFeatured: false },
  { name: "Grapeseed Oil",       description: "Pure unrefined grapeseed oil.",                               price: 600,  category: "Lotion", images: ["/images/seedoil.jpg"],      stock: 22, isFeatured: false },
];

const seedDB = async () => {
  try {
    await connectDB();
    await Product.deleteMany();
    console.log("🗑️  Old products cleared");

    await Product.insertMany(products);
    console.log(`✅ ${products.length} products seeded successfully!`);

    process.exit();
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
};

seedDB();