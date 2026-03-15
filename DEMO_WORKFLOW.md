# LoopLink Demo Guide - End-to-End Workflow

## System Overview

The LoopLink platform has three interfaces:
1. **Shipper Dashboard** (React Web) - Port 5175+
2. **Admin Dashboard** (React Web) - Port 5174  
3. **Driver Mobile App** (Expo/React Native) - Physical Android device via Expo Go

All interfaces connect to a single Go backend API on port 8080.

---

## Prerequisites

### Services Running
Ensure these are running before starting the demo:

```bash
# Backend (if not running)
cd services/backend
go run ./cmd/api/main.go  # Runs on port 8080

# Shipper Web
cd services/shipper-web
npm run dev  # Runs on port 5175

# Admin Web
cd services/admin-web
npm run dev  # Runs on port 5174

# Driver App (already on physical device via Expo Go)
```

### Test Credentials

**Shipper Account:**
- Email: `shipper1@looplink.com`
- Password: `shipper123`

**Admin Account:**
- Email: `admin@looplink.com`
- Password: `admin123`

**Driver Account (on Mobile):**
- Email: `driver1@looplink.com`
- Password: `driver123`

---

## Demo Workflow

### Phase 1: Shipper Creates Shipment Request

**Interface:** Shipper Dashboard (http://localhost:5175/)

1. **Log in** with shipper credentials
   - Email: shipper1@looplink.com
   - Password: shipper123

2. **Navigate to "Create" tab** (should be default)

3. **Fill in Shipment Form:**
   - **From:** Mumbai (or any origin)
   - **To:** Delhi (or any destination)
   - **Load Type:** Select "Vegetables" (or any type)
   - **Weight:** 500 kg
   - **Min Temp:** 2°C
   - **Max Temp:** 8°C
   - **Est. Cost:** 5000 ₹

4. **Click "Create Shipment"** button

   **Expected:** 
   - Green success message: "Shipment created! ID: [UUID]"
   - Form resets to default values

---

### Phase 2: Admin Reviews and Assigns to Driver

**Interface:** Admin Dashboard (http://localhost:5174/)

1. **Log in** with admin credentials
   - Email: admin@looplink.com
   - Password: admin123

2. **Navigate to "Shipments" page** (should be in navigation)

3. **View Shipments Table:**
   - Should show the shipment you just created from Phase 1
   - Look for: "Mumbai → Delhi" entry

4. **Click "Assign" button** on the shipment row
   - Green button next to the "Matches" button

5. **In Assignment Modal:**
   - **Select Driver:** Choose "Rajesh Kumar (driver1@looplink.com)"
   - **Select Vehicle:** Should auto-populate with available vehicles
   - Click on a vehicle from the list

6. **Click "Assign Shipment" button**

   **Expected:**
   - Modal closes
   - Green success notification at top
   - Shipment status updates to "booked"

---

### Phase 3: Driver Sees Notification and Accepts

**Interface:** Driver Mobile App (Expo Go on physical Android device)

1. **Already logged in** with driver1@looplink.com

2. **Navigate to "Assignments" tab** (new tab in app)

3. **Click "Check for New" button** to refresh pending assignments

   **Expected:**
   - The shipment you just assigned should appear in the list
   - Shows: "Mumbai → Delhi | Vegetables | 500kg | 8°C - 2°C | ₹5000"
   - Status badge: "booked"

4. **Click "Accept" button** on the assignment

   **Expected:**
   - Button becomes inactive (loading state)
   - Assignment is moved to acceptance
   - Can navigate to Dashboard to see it in available shipments

---

### Phase 4: Driver Finds Optimal Route

**Interface:** Driver Mobile App - Matching Tab

1. **In Dashboard tab**, find the shipment you accepted

2. **Click "Find" button** to search for optimal routes/matches

   **Expected:**
   - Routes tab shows match options with:
     - Vehicle ID (abbreviated)
     - Match Score (percentage)
     - Estimated Cost (₹)
     - Time estimate

3. **Review Options** and click "Accept" on best match

   **Expected:**
   - Shipment is now confirmed for that route
   - Driver can proceed with pickup/delivery

---

## Key Features Demonstrated

### ✅ Shipper Interface
- Login/Logout
- Create shipment with detailed parameters
- View submitted requests
- Track shipment status

### ✅ Admin Interface
- View all pending shipments
- Assign shipments to specific drivers
- Select from available driver vehicles
- Real-time shipment status updates

### ✅ Driver Mobile Interface
- Login/Logout (already logged in)
- Dashboard: View available shipments
- **Assignments Tab (NEW):** Receive and accept admin assignments
- Matching Tab: Find optimal routes
- Backhauling Tab: View return cargo options

---

## Troubleshooting

### Shipper Dashboard Issues

**Problem:** "Failed to create shipment"
- **Check:** Backend is running on port 8080
- **Check:** `.env` file has correct API URL: `VITE_API_URL=http://127.0.0.1:8080/api/v1`

**Problem:** No shipments shown in "Requests" tab
- **Solution:** Click "Load Shipments" button
- **Check:** Shipments created in this session or previous sessions

### Admin Dashboard Issues

**Problem:** No drivers appear in assignment modal
- **Check:** Backend `/admin/drivers` endpoint is accessible
- **Check:** Drivers exist in database (should have driver1, driver2 seeded)

**Problem:** "This driver has no vehicles" message
- **Check:** Selected driver has assigned vehicles in database
- **Note:** Default seeded driver1 should have a vehicle assigned

### Driver App Issues

**Problem:** "Assignments" tab shows no shipments
- **Solution:** Click "Check for New" button to refresh
- **Check:** Admin has actually assigned a shipment with "booked" status
- **Check:** You're viewing from correct driver account (driver1)

**Problem:** Accept button not responding
- **Check:** Both driver AND vehicle are selected
- **Check:** Network connection from device to backend (10.236.168.104:8080)

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/auth/login` | POST | User authentication |
| `/shipments` | POST | Create new shipment |
| `/shipments` | GET | List all shipments |
| `/admin/shipments` | GET | Admin view of shipments |
| `/admin/drivers` | GET | List all drivers |
| `/drivers/:id/vehicles` | GET | Get vehicles for a driver |
| `/matching/accept` | POST | Assign shipment to driver/vehicle |
| `/matching/search` | POST | Find route matches |

---

## Demo Script (5-10 minutes)

1. **Open three browser windows/tabs:**
   - Tab 1: http://localhost:5175 (Shipper)
   - Tab 2: http://localhost:5174 (Admin)
   - Tab 3: Physical Android device (Driver App)

2. **Sequence:**
   - (2 min) Shipper creates order with specific requirements (cold chain)
   - (2 min) Admin reviews and assigns to driver with best vehicle
   - (2 min) Driver sees assignment notification and accepts
   - (2 min) Driver finds optimal route for delivery

3. **Highlight:** How real-time coordination happens across three interfaces

---

## Success Criteria

- ✅ Shipper can create shipment with temperature/time requirements
- ✅ Admin can see all shipments and assign to drivers
- ✅ Driver receives notification of assignment on mobile
- ✅ Driver can accept assignment and find routes
- ✅ Status updates reflect across all interfaces
- ✅ Real-time data synchronization works smoothly

