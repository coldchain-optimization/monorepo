# Driver Web Dashboard

Professional React-based driver dashboard for the LoopLink cold chain optimization platform.

## Features

- **Driver Authentication**: Secure login/signup with JWT tokens
- **Profile Management**: Complete driver profile with license info and experience
- **Vehicle Management**: Register and manage multiple vehicles with temperature control
- **Shipment Matching**: AI-powered shipment matching with match scores
- **Backhauling Opportunities**: Find return shipments to optimize routes
- **Real-time Updates**: Live match notifications and status tracking
- **Responsive UI**: Mobile-friendly interface with Tailwind CSS

## Project Structure

```
src/
├── pages/               # Page components
│   ├── Login.tsx       # Driver login
│   ├── Signup.tsx      # Account creation
│   ├── RegisterDriver.tsx # Driver profile setup
│   ├── Dashboard.tsx    # Main dashboard
│   ├── MyProfile.tsx    # Profile management
│   ├── MyVehicles.tsx   # Vehicle management
│   ├── Matching.tsx     # Shipment matching
│   └── Backhauling.tsx  # Backhauling opportunities
├── api/
│   └── client.ts        # API client with auth
├── context/
│   └── AuthContext.tsx  # Global auth state
├── layouts/
│   └── MainLayout.tsx   # Main layout wrapper
├── types/
│   └── index.ts         # TypeScript type definitions
└── App.tsx              # Main router setup
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (7.3 seconds build time)
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Fetch API** - HTTP client

## Installation

```bash
cd services/driver-web
npm install
```

## Development

```bash
npm run dev
```

Starts dev server on `http://localhost:5173` with hot module reload.

## Build

```bash
npm run build
```

Creates optimized production build (268 KB, 80 KB gzipped) in `dist/` folder.

## Environment Variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:8080/api/v1
```

## API Integration

The API client (`src/api/client.ts`) handles:
- Token-based authentication (JWT)
- Automatic token injection in headers
- CORS handling
- Error management and logging

All requests include Bearer token in Authorization header.

## Route Structure

### Public Routes
- `/login` - Driver login
- `/signup` - Account creation

### Protected Routes
- `/register-driver` - Driver profile setup (after signup)
- `/dashboard` - Main driver dashboard
- `/profile` - Driver profile management
- `/vehicles` - Vehicle management (CRUD)
- `/matching` - Search shipments and view matches
- `/backhauling` - Backhauling opportunities

## Key Components

### AuthContext
Global authentication state with:
- User data and auth status
- Token persistence (localStorage)
- Login/signup/logout handlers
- Auto-auth check on mount

### MainLayout
Responsive sidebar layout with:
- Left navigation menu
- Top status bar
- Main content area
- Mobile responsiveness

### API Client
Centralized API calls with:
- Automatic auth headers
- Request/response typing
- Error handling
- Token refresh support

## Shipment Matching Algorithm

Match scores (0-1) are calculated by backend based on:
- Vehicle capacity vs. shipment weight
- Temperature range compatibility
- Location proximity
- Availability matching
- Driver rating and experience

Score visualization:
- **80%+ (Green)**: Excellent match
- **60-79% (Yellow)**: Good match  
- **Below 60% (Orange)**: Fair match

## Performance

- **Build Time**: 1.59s with Vite
- **Bundle Size**: 267.89 KB (JS) + 15 KB (CSS)
- **Gzipped**: 80.13 KB JavaScript
- **TypeScript Compilation**: Zero errors
- **Browser Support**: Modern browsers (ES2020)

## Security

- JWT tokens in Authorization header
- HTTPS in production
- CORS properly configured
- Input validation on all forms
- Protected routes with auth guards
- Secure token storage

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure API URL**
   ```bash
   echo "VITE_API_URL=http://localhost:8080/api/v1" > .env.local
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

## API Endpoints Used

### Authentication
- `POST /public/auth/login` - Login
- `POST /public/auth/signup` - Register user
- `GET /auth/profile` - Get current profile

### Driver Management
- `POST /drivers` - Register as driver
- `GET /drivers/me` - Get my profile
- `PUT /drivers/me` - Update my profile
- `GET /drivers/me/vehicles` - List my vehicles

### Vehicle Management  
- `POST /vehicles` - Create vehicle
- `GET /vehicles` - List all vehicles
- `PUT /vehicles/:id` - Update vehicle
- `DELETE /vehicles/:id` - Delete vehicle

### Shipment Matching
- `GET /matching/search` - Search available matches
- `POST /matching/accept` - Accept a match
- `POST /matching/:id/reject` - Reject a match
- `POST /matching/feedback` - Submit shipment feedback
- `GET /matching/backhauling/:id` - Get backhauling opportunities

## Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes maintaining type safety
3. Build and test: `npm run build`
4. Commit with clear messages
5. Push and create PR

## License

MIT - See LICENSE file for details


```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
