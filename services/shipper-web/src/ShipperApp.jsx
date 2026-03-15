import { useState } from 'react';
import { api } from './api/client';
import TrackingPage from './pages/TrackingPage.jsx';

const INDIA_CITIES = [
  'Ahmedabad',
  'Bengaluru',
  'Bhopal',
  'Chandigarh',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Guwahati',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Kanyakumari',
  'Kochi',
  'Kolkata',
  'Lucknow',
  'Madurai',
  'Mumbai',
  'Nagpur',
  'Patna',
  'Pune',
  'Raipur',
  'Surat',
  'Thiruvananthapuram',
  'Trivandrum',
  'Vijayawada',
  'Visakhapatnam',
];

function normalizeCityInput(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Searchable dropdown component for cities - allows both presets and custom cities
function SearchableSelect({ label, value, onChange, options, placeholder = 'Search or select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter((city) =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if search term matches any existing option
  const hasExactMatch = options.some((city) =>
    city.toLowerCase() === searchTerm.toLowerCase()
  );

  // Allow custom city input if user types something not in the list
  const allowCustom = searchTerm.trim().length > 0 && !hasExactMatch;

  const handleSelect = (city) => {
    onChange(city);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
        {label}
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 'normal', marginLeft: 4 }}>
          (type to search or enter any city)
        </span>
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm || (isOpen ? '' : value)}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          // Allow Enter to confirm custom city
          if (e.key === 'Enter' && searchTerm.trim().length > 0) {
            handleSelect(searchTerm.trim());
            e.preventDefault();
          }
        }}
        style={{
          width: '100%',
          padding: 10,
          border: '1px solid #ccc',
          borderRadius: 6,
          boxSizing: 'border-box',
          fontSize: 14,
          backgroundColor: '#fff',
        }}
      />
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            maxHeight: 250,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {filteredOptions.length > 0 || allowCustom ? (
            <>
              {/* Show matching preset cities */}
              {filteredOptions.map((city) => (
                <div
                  key={city}
                  onClick={() => handleSelect(city)}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: value === city ? '#e0f2fe' : '#fff',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    if (value !== city) {
                      e.target.style.backgroundColor = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== city) {
                      e.target.style.backgroundColor = '#fff';
                    }
                  }}
                >
                  {city}
                </div>
              ))}
              
              {/* Show custom city option if user typed something not in list */}
              {allowCustom && (
                <div
                  onClick={() => handleSelect(searchTerm.trim())}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: '#f0fdf4',
                    borderTop: filteredOptions.length > 0 ? '1px solid #e2e8f0' : 'none',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: 14,
                    color: '#22c55e',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dcfce7';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f0fdf4';
                  }}
                >
                  ✓ Use custom city: "{searchTerm.trim()}"
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '10px 12px', color: '#999', fontSize: 14 }}>
              No matching cities. Press Enter to use "{searchTerm.trim()}"
            </div>
          )}
        </div>
      )}
      {isOpen && (
        <div
          onClick={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
}

export default function ShipperApp() {
  const [tab, setTab] = useState('create');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('shipper1@looplink.com');
  const [password, setPassword] = useState('shipper123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [source, setSource] = useState('Mumbai');
  const [destination, setDestination] = useState('Delhi');
  const [loadType, setLoadType] = useState('Vegetables');
  const [loadWeight, setLoadWeight] = useState(500);
  const [tempMin, setTempMin] = useState(2);
  const [tempMax, setTempMax] = useState(8);
  const [estimatedCost, setEstimatedCost] = useState(5000);

  const [shipments, setShipments] = useState([]);
  const [acceptedShipments, setAcceptedShipments] = useState([]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      localStorage.setItem('token', res.token);
      api.setToken(res.token);
      setSuccess('Login successful!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    api.clearToken();
  };

  const handleCreateShipment = async () => {
    setLoading(true);
    setError('');
    try {
      // Values are already valid since they're selected from dropdowns
      const payload = {
        source_location: source,
        destination_location: destination,
        load_type: loadType,
        load_weight: loadWeight,
        temperature_min: tempMin,
        temperature_max: tempMax,
        estimated_cost: estimatedCost,
      };
      
      const res = await api.request('POST', '/shipments', payload);
      const shipment = res.shipment || res;
      setSuccess(`Shipment created! ID: ${shipment.id}`);
      setShipments([...shipments, shipment]);
      
      // Reset form
      setSource('Mumbai');
      setDestination('Delhi');
      setLoadType('Vegetables');
      setLoadWeight(500);
      setTempMin(2);
      setTempMax(8);
      setEstimatedCost(5000);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadShipments = async () => {
    setLoading(true);
    try {
      const res = await api.request('GET', '/shipments', undefined);
      setShipments(res.shipments || []);
    } catch (e) {
      setError(e.message || 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ maxWidth: 400, margin: '100px auto', fontFamily: 'Arial' }}>
        <div style={{
          border: '1px solid #ddd',
          padding: 24,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2>Shipper Login</h2>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10, marginBottom: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: 10,
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          {error && <p style={{ color: '#dc2626', marginTop: 10 }}>{error}</p>}
          <p style={{ marginTop: 16, fontSize: 12, color: '#666' }}>
            Demo: Use <strong>shipper1@looplink.com / shipper123</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 'bold' }}>LoopLink - Shipper</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        padding: '8px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: 8,
      }}>
        {['create', 'requests', 'accepted', 'tracking'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 12px',
              backgroundColor: tab === t ? '#4f46e5' : '#f1f5f9',
              color: tab === t ? '#fff' : '#333',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: tab === t ? 'bold' : 'normal',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
        {success && <div style={{ padding: 12, backgroundColor: '#d1fae5', color: '#065f46', borderRadius: 6, marginBottom: 16 }}>{success}</div>}
        {error && <div style={{ padding: 12, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>{error}</div>}

        {tab === 'create' && (
          <div style={{
            backgroundColor: '#fff',
            padding: 24,
            borderRadius: 12,
            maxWidth: 600,
            border: '1px solid #e2e8f0',
          }}>
            <h2>Create Shipment Request</h2>
            {error && <div style={{ padding: 12, backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              <SearchableSelect
                label="From"
                value={source}
                onChange={setSource}
                options={INDIA_CITIES}
                placeholder="Search for source city..."
              />
              <SearchableSelect
                label="To"
                value={destination}
                onChange={setDestination}
                options={INDIA_CITIES}
                placeholder="Search for destination city..."
              />
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Load Type</label>
                <select
                  value={loadType}
                  onChange={(e) => setLoadType(e.target.value)}
                  style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                >
                  <option>Vegetables</option>
                  <option>Fruits</option>
                  <option>Dairy</option>
                  <option>Seafood</option>
                  <option>Pharma</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Weight (kg)</label>
                <input
                  type="number"
                  value={loadWeight}
                  onChange={(e) => setLoadWeight(Number(e.target.value))}
                  style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Min Temp (°C)</label>
                  <input
                    type="number"
                    value={tempMin}
                    onChange={(e) => setTempMin(Number(e.target.value))}
                    style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Max Temp (°C)</label>
                  <input
                    type="number"
                    value={tempMax}
                    onChange={(e) => setTempMax(Number(e.target.value))}
                    style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Est. Cost (₹)</label>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={handleCreateShipment}
                disabled={loading}
                style={{
                  padding: 12,
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginTop: 12,
                }}
              >
                {loading ? 'Creating...' : 'Create Shipment'}
              </button>
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div>
            <button
              onClick={handleLoadShipments}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              Load Shipments
            </button>
            <div style={{ display: 'grid', gap: 12 }}>
              {shipments.map((s) => (
                <div key={s.id} style={{
                  backgroundColor: '#fff',
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>
                    {s.source_location} → {s.destination_location}
                  </h3>
                  <p style={{ margin: '4px 0', color: '#666' }}>
                    {s.load_type} | {s.load_weight}kg | {s.temperature_min}°C - {s.temperature_max}°C | ₹{s.estimated_cost}
                  </p>
                  {s.status && <p style={{ margin: '4px 0', color: '#4f46e5', fontWeight: 'bold' }}>Status: {s.status}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'accepted' && (
          <div>
            <p style={{ color: '#666' }}>Accepted shipments will appear here once assigned by admin.</p>
          </div>
        )}

        {tab === 'tracking' && <TrackingPage />}
      </div>
    </div>
  );
}
