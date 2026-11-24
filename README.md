# ZAD Foods — E-Commerce Storefront & Dynamic Admin CMS

**Pure Goodness in Every Bite** — Full-featured, bilingual (Bangla default / English secondary) E-commerce storefront and dynamic Admin Dashboard for **ZAD Foods** (Mirpur-14, Dhaka, Bangladesh), built with React, TypeScript, Tailwind CSS, and Firebase (Cloud Firestore, Firebase Authentication, and Firebase Storage).

---

## 1. Firebase Configuration & Architecture

This project is pre-configured with Firebase via `/firebase-applet-config.json`:

- **Cloud Firestore**: Stores all live catalog data (`products`, `categories`, `settings`, `media`, `reviews`), transactional orders (`orders`, `orderTracking`), stock audit logs (`stockLogs`), customer inquiries (`inquiries`), user profiles (`users`), and admin RBAC roles (`admins`).
- **Firebase Authentication**: Uses Google Sign-In for both customer accounts (`/account`) and protected Admin Dashboard access (`/admin/login`).
- **Firebase Storage**: Used by the Admin Image Uploader for uploading client-side optimized WebP images (with built-in crop, zoom, and rotation tools).
- **Security Rules (`/firestore.rules`)**: Deployed to Cloud Firestore to enforce public read-only catalog access, PII isolation on customer orders, non-PII public order status tracking (`orderTracking`), and role-based admin write access.

> **Important Security Note:** Before sharing or promoting this storefront publicly, review and harden `/firestore.rules` and configure Firebase Storage security rules in the Firebase Console so only authenticated admins can upload or delete media files.

---

## 2. First-Time Admin Login & Automatic Database Seeding

1. Open the app and navigate to **`/admin/login`** (or click **Admin** from the footer).
2. Click **Sign in with Google** using the bootstrapped Owner Admin account:
   - **Bootstrapped Owner Email**: `arafatsunnythree@gmail.com`
3. On first verified owner sign-in, the app automatically:
   - Registers your Owner Admin profile in Firestore (`admins/{uid}`).
   - Seeds the initial **ZAD Foods** store settings, 6 categories, 8 real products (including exact retail/wholesale/bulk pricing and `Mini Honey Nuts` saved as a `draft` without an invented price), and the 10 official brand & product media assets into Cloud Firestore.
4. Once logged in, you can add additional managers or staff from **Admin Dashboard → Admin Security** by entering their Firebase UID, email, and role (`owner`, `manager`, or `staff`).

### Configuring Firebase Storage Rules (for New Image Uploads)
The initial 10 brand/product assets load directly from `/assets/aistudio/`. When uploading new product photos or banners via the Admin Media Uploader, ensure Firebase Storage is enabled in your Firebase Console with rules that allow public reads and authenticated admin writes.

---

## 3. Running Locally & Building for Production

### Prerequisites
- Node.js 20+
- npm 10+

### Development Server
```bash
npm install
npm run dev
```
The app runs on `http://localhost:3000`.

### Type Check & Production Build
```bash
npm run lint
npm run build
```
The compiled production bundle is output to `dist/` (with `src/assets` and `public/` assets preserved).

---

## 4. Managing the Store Without Touching Code

All storefront content, branding, prices, and orders are editable live from **`/admin`**:

- **Products (`/admin` → Products)**:
  - Add, edit, publish, draft, or delete products.
  - Manage multi-image galleries (drag-and-drop reorder, cover image selection, crop/rotate/zoom/WebP upload).
  - Configure variants (weight/pack size), stock counts, retail prices (`৳`), wholesale prices + minimum order quantities, and special bulk pricing tiers (e.g., Ten Nuts 25g 300+ pcs @ ৳18/pc).
  - Update **Black Seed Flower Honey (500g)** or publish **Mini Honey Nuts** whenever final pricing is ready.
- **Orders & Stock Automation (`/admin` → Orders & Inventory)**:
  - Filter orders by status, date, payment method, or Order ID / phone number.
  - Update order statuses across the 8-step lifecycle (`Pending`, `Confirmed`, `Processing`, `Packed`, `Shipped`, `Delivered`, `Cancelled`, `Returned`) with automatic stock deduction/restoration per your **Delivery & Stock Policy**.
  - Print clean A4/thermal-ready invoices directly from any order detail drawer.
- **Homepage & Content CMS (`/admin` → Homepage Editor / Website Content)**:
  - Edit hero slides, announcement bar, trust badges, promotional banners, About Us story, Contact page details, and Privacy / Terms / Return policies in both Bangla and English.
- **Appearance & Branding (`/admin` → Appearance)**:
  - Upload a new logo or favicon, customize brand colors (`Primary`, `Accent`, `Background`, `Text`), corner radius, and header/footer toggles.
- **Delivery, Payments & Business Settings (`/admin` → Delivery & Policy / Business Settings)**:
  - Configure Inside Dhaka / Outside Dhaka charges, free delivery thresholds, Cash on Delivery, optional bKash / Nagad / Rocket / Bank Transfer numbers, WhatsApp order number (`01772103832`), email address, and social links.
