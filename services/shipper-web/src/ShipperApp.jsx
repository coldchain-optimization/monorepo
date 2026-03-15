import { useState } from 'react';
import { api } from './api/client';
import TrackingPage from './pages/TrackingPage.jsx';

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
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>From</label>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                  placeholder="Source location"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>To</label>
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                  placeholder="Destination"
                />
              </div>
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
