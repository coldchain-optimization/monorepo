# LoopLink - Complete Setup & Demo Guide

## 🚀 Quick Start (3 minutes)

### Step 1: Start Backend (if not running)
```bash
cd services/backend
go run ./cmd/api/main.go
# Backend runs on http://localhost:8080
```

### Step 2: Start Driver Web
```bash
cd services/driver-web
npm install
npm run dev
# Driver App runs on http://localhost:5173
```

### Step 3: Start Admin Web
```bash
cd services/admin-web
npm install
npm run dev
# Admin App runs on http://localhost:5174
```

### Step 4: Hard Refresh Browser
- **Ctrl+Shift+R** (Windows/Linux)
- **Cmd+Shift+R** (Mac)

---

## 📊 Demo Credentials

### Driver Account (Already registered with profile)
```
Email: driver@test.com
Password: driver@test.com (use from database)
```

### Admin Account
```
Email: testadmin@test.com
Password: test@123
```

### Shipper Account
```
Email: shipper@test.com
Password: shipper@test.com
```

---

## 🎯 Driver-Web Demo Flow

### 1. Login as Driver
- Go to http://localhost:5173
- **Email**: `driver@test.com`
- **Password**: `driver@test.com`
- Click **"Sign In"**

### 2. Dashboard - Full-Screen View
You'll see:
- **✓ Full-width dashboard** with sidebar navigation
- **Profile Status Card**: Your driver info (license, phone, experience, rating)
- **3 Stat Cards** in responsive grid:
  - Active Vehicles count
  - Available Matches count
  - Total Earnings
- **Available Shipments Section**: Shows shipment opportunities
- **Quick Action Buttons**: Search Shipments & Backhauling

### 3. Navigation Menu (Left Sidebar)
- 📊 **Dashboard** - Overview and statistics
- 👤 **My Profile** - Edit driver information
- 🚚 **My Vehicles** - Manage your vehicles
- 📦 **Find Shipments** - Search for shipment matches
- ↩️ **Backhauling** - Return shipment opportunities

### 4. Add a Vehicle
1. Click **"My Vehicles"** in sidebar
2. Click **"Add Vehicle"** button
3. Fill in:
   - Vehicle Type: `Refrigerated Truck`
   - License Plate: `KA01TEST2024`
   - Manufacturer: `Ashok Leyland`
   - Model: `2520 A`
   - Year: `2024`
   - Capacity: `5000` kg
   - Refrigerated: **Checked** ✓
   - Temperature: `4` °C
   - Fuel: `Diesel`
   - Carbon Footprint: `50` kg/km
4. Click **"Add Vehicle"**

### 5. Search for Shipments
1. Click **"Find Shipments"** in sidebar
2. You'll see available shipments:
   - Mumbai → Bangalore (₹15,000)
   - Pune → Delhi (₹18,000)
   - Delhi → Jaipur (₹8,000)
   - And more...
3. Click **"View Details"** on any shipment
4. Click **"Accept Match"** to bid for the shipment

### 6. Edit Profile
1. Click **"My Profile"** in sidebar
2. Update your phone number or experience
3. Click **"Save Changes"**

### 7. Logout
- Click **"Logout"** button in sidebar
- You'll be redirected to login page

---

## 🎨 Admin-Web Demo Flow

### 1. Login as Admin
- Go to http://localhost:5174
- **Email**: `testadmin@test.com`
- **Password**: `test@123` (or as in your database)
- Click **"Sign In"**

### 2. Admin Dashboard
You'll see:
- **Dashboard Overview** with system statistics
- **Quick Stats Cards**:
  - Total Drivers
  - Total Shipments
  - Total Vehicles
  - Active Matches
- **Data Tables** with filter options

### 3. Manage Shipments
1. Click **"Shipments"** in navigation
2. View all shipments created in the system
3. Filter by status (available, assigned, completed)
4. Click on any shipment to see details

### 4. Manage Drivers
1. Click **"Drivers"** in navigation
2. View all registered drivers
3. See ratings, vehicles, and activity status
4. Click driver details to see full profile

### 5. Manage Vehicles
1. Click **"Vehicles"** in navigation
2. View all vehicles in the system
3. Filter by type (truck, van, etc.)
4. See vehicle capacity and refrigeration status

### 6. View Users
1. Click **"Users"** in navigation
2. See all users (drivers, shippers, admins)
3. Filter by role

---

## 📈 Database Structure

### Tables Created
1. **users** - User accounts (4 test users)
2. **drivers** - Driver profiles (2 test drivers)
3. **shippers** - Shipper companies (2 test shippers)
4. **vehicles** - Vehicles (3 test vehicles registered)
5. **shipments** - Freight shipments (5+ test shipments)
6. **consignments** - Cargo items (sub-shipments)
7. **knowledge_base** - Matching algorithm history

### Test Data Populated
- ✅ 4 Users (1 driver, 1 shipper, 1 admin)
- ✅ 2 Driver profiles
- ✅ 2 Shipper companies
- ✅ 3 Vehicles (all refrigerated)
- ✅ 5 Shipments (with different routes and cargo)
- ✅ Matching scores calculated

---

## 🌐 UI/UX Features

### Driver-Web
- ✅ **Full-screen website layout** (not mobile-constrained)
- ✅ **Responsive grid** (auto-adjusts to screen size)
- ✅ **Left sidebar navigation** (professional dashboard style)
- ✅ **Modern cards** with shadows and hover effects
- ✅ **Color-coded badges** (match scores, status)
- ✅ **Real-time form validation**
- ✅ **Loading spinners** for async operations
- ✅ **Error handling** with retry buttons
- ✅ **Mobile responsive** (also works on tablets/phones)

### Admin-Web
- ✅ **Professional dashboard** with statistics
- ✅ **Data tables** with filtering
- ✅ **Multi-page layout**
- ✅ **Admin-only features**

---

## 🔧 Technical Stack

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin v1.10
- **Database**: PostgreSQL 15
- **Auth**: JWT tokens
- **Running on**: http://localhost:8080

### Driver Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Running on**: http://localhost:5173

### Admin Frontend
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Running on**: http://localhost:5174

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 8080 is free
lsof -i :8080

# Kill process if needed
kill -9 <PID>

# Rebuild and run
cd services/backend
go build -o looplink-server ./cmd/api/main.go
./looplink-server
```

### Frontend Shows "Cannot connect to API"
```bash
# Verify backend is running
curl http://localhost:8080/health
# Should return: {"status": "healthy"}

# Check API URL in frontend config
cat services/driver-web/src/api/client.ts | grep API_BASE
```

### Database Connection Error
```bash
# Check if PostgreSQL is running (Docker)
docker ps | grep postgres

# Verify database exists
docker exec looplink-postgres psql -U postgres -d looplink -c "\dt"
```

### Driver Registration Redirects Forever
- This is expected if driver profile doesn't exist
- Complete the registration form and submit
- Should redirect to dashboard automatically

### Port Already in Use
```bash
# Find process using port
lsof -i :<PORT>

# Kill it
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

---

## 📱 Responsive Design

The driver-web is **fully responsive**:
- **Desktop** (1024px+): Full sidebar + content
- **Tablet** (768px-1024px): Responsive grid layout
- **Mobile** (< 768px): Stack cards vertically, collapsible menu

Try resizing your browser to see the responsive layout!

---

## 🎬 Full Demo Script (10 minutes)

### Timeline

**0:00-1:00** - Login
- Show login page
- Enter credentials
- Auto-redirect to dashboard

**1:00-3:00** - Dashboard Overview
- Explain the full-screen website layout
- Show sidebar navigation
- Point out stat cards (vehicles, matches, earnings)
- Highlight available shipments section

**3:00-5:00** - Add Vehicle
- Navigate to "My Vehicles"
- Click "Add Vehicle"
- Fill in form fields
- Submit and see success

**5:00-7:00** - Search Shipments
- Click "Find Shipments"
- Show list of available shipments
- Explain match scores
- Click details on a shipment

**7:00-8:00** - Admin Panel
- Switch to admin-web
- Show admin dashboard
- Navigate to shipments/drivers/vehicles

**8:00-10:00** - Q&A
- Explain architecture
- Discuss database schema
- Answer questions

---

## 💾 Database Seeding (Manual)

If you need to reseed the database:

```bash
# Connect to PostgreSQL
docker exec -it looplink-postgres psql -U postgres -d looplink

# Run SQL commands
\i /path/to/seed.sql

# Or manually insert data:
INSERT INTO users (...) VALUES (...);
```

---

## 📦 Build & Deployment

### Production Build

**Driver Web:**
```bash
cd services/driver-web
npm run build
# Creates: dist/ folder with optimized assets
# Size: ~275 KB JS + 19 KB CSS
```

**Admin Web:**
```bash
cd services/admin-web
npm run build
# Creates: dist/ folder with optimized assets
# Size: ~684 KB JS + 21 KB CSS
```

---

## ✨ Key Features to Highlight

1. **Real-time Matching Algorithm**
   - Matches drivers with shipments based on:
     - Vehicle capacity
     - Temperature requirements
     - Location proximity
     - Experience & ratings

2. **Cold Chain Management**
   - Temperature-controlled vehicles
   - Refrigeration tracking
   - Carbon footprint calculations

3. **Responsive Web Design**
   - Works on all devices
   - Full-screen website layout
   - Professional UI/UX

4. **Professional Admin Panel**
   - System-wide statistics
   - User management
   - Shipment tracking
   - Driver monitoring

---

## 🚀 Next Steps

1. **Deploy to Cloud** - AWS/GCP/Azure
2. **Add Real GPS Tracking** - Live vehicle location
3. **Payment Integration** - Stripe/Razorpay
4. **Mobile App** - React Native
5. **Real-time Updates** - WebSocket support
6. **Advanced Analytics** - Dashboard with charts

---

**Ready to demo? Start the servers and refresh your browser! 🎉**
