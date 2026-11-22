// ===================================================================
//  LastCall Eats - "backend" file.
//  Edit anything here, SAVE (Ctrl + S) and the website updates.
//  (With the Live Server extension it refreshes automatically.)
// ===================================================================
const CONFIG = {
  canteen: 'Main Campus Canteen',
  tagline: 'Leftover meals at half price. Book before they are gone.',

  // Website colours: change a value and save to see it change
  theme: {
    background: '#eef0f7',   // page background
    header: '#262b57',       // top banner colour
    accent: '#ff8a3d',       // buttons and counter numbers
  },

  // Surplus meals. pickupBy uses 24-hour time (HH:MM)
  meals: [
    { id: 1, name: 'Paneer Butter Masala Thali', originalPrice: 120, price: 60, quantity: 8,  pickupBy: '23:59' },
    { id: 2, name: 'Veg Biryani Bowl',           originalPrice: 90,  price: 45, quantity: 5,  pickupBy: '23:45' },
    { id: 3, name: 'Masala Dosa Combo',          originalPrice: 70,  price: 35, quantity: 10, pickupBy: '23:30' },
  ],
};
