import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Home, Heart, Plus, Minus } from "lucide-react"; // Icons
import Navbar from "./NavbarPage";
import { useAppContext } from "../components/AppContext"; // Import context for cart & favorites
import { axiosInstance } from "../utils/axios"; // Axios instance for API calls
import { auth } from "../../firebase"; // Firebase authentication
import { v4 as uuidv4 } from "uuid"; // Unique session ID generator
import ProductDetails from "../components/ProductDetails"; // Import the ProductDetails component

// Import images
import Spinach from "../assets/images_home/Spinach.webp";
import fruits from "../assets/images_home/fruits.webp";
import grains from "../assets/images_home/grains.webp";
import grocery from "../assets/images_home/grocery.webp";
import pickle from "../assets/images_home/pickle.webp";
import podi from "../assets/images_home/podi.webp";
import rice from "../assets/images_home/rice.webp";
import tveg from "../assets/images_home/tveg.webp";

import spi1 from "../assets/products/sirukeerai.webp";
import spi2 from "../assets/products/mulaikeerai.webp";
import spi3 from "../assets/products/Thandukeerai.webp";
import brinjal from "../assets/products/brinjal.webp";
import toor from "../assets/products/thoordal.webp";
import oran from "../assets/products/ORANGE.webp";

const categories = [
  { id: 1, name: "Spinach Leaf Varieties", image: Spinach },
  { id: 2, name: "Traditional Vegetables", image: tveg },
  { id: 3, name: "Grains and Pulses", image: grains },
  { id: 4, name: "Fruits", image: fruits },
  { id: 5, name: "Grocery & Provisions", image: grocery },
  { id: 6, name: "Pickles & Preserves", image: pickle },
  { id: 7, name: "Podi Varieties", image: podi },
  { id: 8, name: "Traditional Rice Varieties", image: rice },
];

const products = [
  { id: 101, category: 1, name: "Siru Keerai", price: 25, image: spi1, unit: "1-PS" },
  { id: 102, category: 1, name: "Mulai Keerai", price: 25, image: spi2, unit: "1-PS" },
  { id: 103, category: 1, name: "Thandu Keerai", price: 25, image: spi3, unit: "1-PS" },
  { id: 104, category: 2, name: "Brinjal", price: 30, image: brinjal, unit: "1-PS" },
  { id: 105, category: 3, name: "Toor Dal", price: 80, image: toor, unit: "1-KG" },
  { id: 106, category: 4, name: "Orange", price: 50, image: oran, unit: "1-PS" },
];

const Searchproduct = () => {
  const { id } = useParams();
  const categoryId = parseInt(id, 10);
  const [activeCategory, setActiveCategory] = useState(categoryId || null);
  const [quantities, setQuantities] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [sessionId] = useState(() => uuidv4());

  // Use app context for cart and favorites
  const { addToCart, toggleFavorite, isProductFavorite } = useAppContext();

  // Get user ID on component mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = products.filter((product) => product.category === categoryId);
  const categoryName = categories.find((cat) => cat.id === categoryId)?.name || "Products";

  // Utility functions for event tracking
  const getDeviceType = () => {
    const userAgent = navigator.userAgent;
    if (/Mobi|Android/i.test(userAgent)) return "mobile";
    if (/iPad|Tablet/i.test(userAgent)) return "tablet";
    return "desktop";
  };

  const getTimeOfDay = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return "morning";
    if (hours >= 12 && hours < 17) return "afternoon";
    if (hours >= 17 && hours < 21) return "evening";
    return "night";
  };

  // Send events to backend
  const sendEvent = async (product, eventType) => {
    if (!userId || !product) return;

    const eventData = {
      userId,
      productId: product.id,
      eventType,
      context: {
        device: getDeviceType(),
        timeOfDay: getTimeOfDay(),
        page: "search-product",
        category: categoryId
      },
      sessionId
    };

    try {
      const response = await axiosInstance.post("/event", eventData);
      console.log(`Event "${eventType}" sent successfully!`, response.data);
    } catch (error) {
      console.error("Error sending event:", error.response ? error.response.data : error.message);
    }
  };

  const handleIncrement = (product, e) => {
    if (e) e.stopPropagation();
    
    setQuantities((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 1) + 1,
    }));
    
    // Send event for quantity change
    sendEvent(product, "increase_quantity");
  };

  const handleDecrement = (product, e) => {
    if (e) e.stopPropagation();
    
    setQuantities((prev) => {
      const newQuantity = (prev[product.id] || 1) - 1;
      if (newQuantity < 1) {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      }
      return { ...prev, [product.id]: newQuantity };
    });
    
    // Send event for quantity change
    sendEvent(product, "decrease_quantity");
  };

  const toggleCounter = (product, e) => {
    // Stop event propagation to prevent opening detail modal when clicking the + button
    if (e) e.stopPropagation();
    
    // If quantity doesn't exist, set it to 1, otherwise toggle it off
    setQuantities((prev) => {
      if (!prev[product.id]) {
        // If adding to cart for the first time
        addToCart(product, 1);
        sendEvent(product, "add_to_cart");
        return { ...prev, [product.id]: 1 };
      }
      const newQuantities = { ...prev };
      delete newQuantities[product.id];
      return newQuantities;
    });
  };

  const handleToggleFavorite = (product, e) => {
    // Stop event propagation to prevent opening detail modal when clicking the heart
    if (e) e.stopPropagation();
    
    toggleFavorite(product);
    sendEvent(product, "favourite");
  };

  const openProductDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
    sendEvent(product, "view");
  };

  const closeProductDetails = () => {
    setIsDetailsOpen(false);
  };

  const handleAddToCart = () => {
    if (selectedProduct) {
      // Set default quantity if not already set
      if (!quantities[selectedProduct.id]) {
        setQuantities((prev) => ({
          ...prev,
          [selectedProduct.id]: 1,
        }));
      }
      
      // Add item to cart
      addToCart(selectedProduct, quantities[selectedProduct.id] || 1);
      sendEvent(selectedProduct, "add_to_cart");
      
      // Optionally close the modal after adding to cart
      // closeProductDetails();
    }
  };

  return (
    <div className="relative">
      <div className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
        <Navbar />
      </div>

      <div className="flex pt-16 mt-16">
        <div className="w-1/4 p-4 h-screen">
          <div className="mb-4">
            <Link to="/" className="flex items-center text-gray-900">
              <Home size={16} className="mr-2" /> <span className="font-medium text-sm">Home</span>
            </Link>
          </div>

          <h2 className="text-xl font-semibold mb-6">Categories</h2>
          <ul className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-100">
            {categories.map((cat) => (
              <li key={cat.id} className="mb-0">
                <Link
                  to={`/search/category/${cat.id}`}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center p-4 border-gray-600 bg-white shadow hover:bg-gray-200 w-full ${
                    activeCategory === cat.id ? "bg-gray-300 font-semibold" : ""
                  }`}
                >
                  <img src={cat.image} alt={cat.name} className="w-12 h-12 mr-3" />
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-3/4 p-4">
          <h2 className="text-md text-gray-500 mb-6">Showing results for: {categoryName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 cursor-pointer">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="border p-6 rounded-lg shadow bg-white relative group"
                  onClick={() => openProductDetails(product)}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-lg transition-transform group-hover:scale-110"
                    />

                    {!quantities[product.id] && (
                      <button
                        onClick={(e) => toggleCounter(product, e)}
                        className="absolute bottom-0 right-2 bg-emerald-600 text-white rounded-full p-2"
                      >
                        <Plus size={24} />
                      </button>
                    )}

                    {quantities[product.id] && (
                      <div className="absolute bottom-0.5 right-14 flex items-center bg-white shadow-lg rounded-md p-2">
                        <button 
                          onClick={(e) => handleDecrement(product, e)} 
                          className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded-2xl"
                        >
                          <Minus size={20} />
                        </button>
                        <span className="mx-4 text-sm font-semibold">{quantities[product.id]}</span>
                        <button 
                          onClick={(e) => handleIncrement(product, e)} 
                          className="p-2 text-gray-700 hover:text-black hover:bg-gray-200 rounded-2xl"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-900 mt-2 text-lg font-semibold">₹{product.price}.00</p>
                  <p className="mt-4 text-md font-medium">{product.name}</p>
                  <p className="text-gray-500 font-semibold mt-2 mb-4">{product.unit}</p>
                 
                  <button
                    onClick={(e) => handleToggleFavorite(product, e)}
                    className="mt-2 text-gray-500 hover:text-emerald-600"
                  >
                    <Heart
                      size={24}
                      fill={isProductFavorite(product.id) ? "#02B290" : "none"}
                      stroke={isProductFavorite(product.id) ? "#02B290" : "gray"}
                    />
                  </button>
                </div>
              ))
            ) : (
              <p>No products found for {categoryName}.</p>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      <ProductDetails
        product={selectedProduct}
        isOpen={isDetailsOpen}
        onClose={closeProductDetails}
        onAddToCart={handleAddToCart}
        onToggleFavorite={(e) => selectedProduct && handleToggleFavorite(selectedProduct, e)}
        quantity={selectedProduct ? quantities[selectedProduct.id] || 1 : 1}
        onIncrement={() => selectedProduct && handleIncrement(selectedProduct)}
        onDecrement={() => selectedProduct && handleDecrement(selectedProduct)}
        isFavorite={selectedProduct ? isProductFavorite(selectedProduct.id) : false}
      />
    </div>
  );
};

export default Searchproduct;