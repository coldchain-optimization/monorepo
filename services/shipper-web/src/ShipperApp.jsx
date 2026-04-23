import { useState } from 'react';
import { api } from './api/client';
import TrackingPage from './pages/TrackingPage.jsx';
import { 
  Package, Map, CheckCircle, List, PlusCircle, 
  LogOut, Truck, DollarSign, Thermometer, Weight, 
  MapPin, Loader2, ArrowRight, XCircle
} from 'lucide-react';

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

function SearchableSelect({ label, value, onChange, options, placeholder = 'Search or select...', icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter((city) =>
    city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasExactMatch = options.some((city) =>
    city.toLowerCase() === searchTerm.toLowerCase()
  );

  const allowCustom = searchTerm.trim().length > 0 && !hasExactMatch;

  const handleSelect = (city) => {
    onChange(city);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full relative z-50">
      <label className="block text-[13px] font-medium text-slate-400 mb-2 uppercase tracking-wide">
        {label}
        <span className="text-xs text-slate-500 font-normal ml-2 hidden sm:inline">
          (type or select)
        </span>
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary group-focus-within:text-secondary transition-colors">
          {Icon && <Icon size={18} />}
        </div>
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
            if (e.key === 'Enter' && searchTerm.trim().length > 0) {
              handleSelect(searchTerm.trim());
              e.preventDefault();
            }
          }}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} dark-input peer`}
        />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full glass-panel max-h-64 overflow-auto shadow-2xl shadow-primary/10">
          {filteredOptions.length > 0 || allowCustom ? (
            <div className="py-1">
              {filteredOptions.map((city) => (
                <div
                  key={city}
                  onClick={() => handleSelect(city)}
                  className={`px-4 py-3 cursor-pointer text-sm transition-all duration-150 ${
                    value === city 
                    ? 'bg-primary/20 text-white font-bold border-l-4 border-primary' 
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  {city}
                </div>
              ))}
              
              {allowCustom && (
                <div
                  onClick={() => handleSelect(searchTerm.trim())}
                  className="px-4 py-3 cursor-pointer text-sm text-secondary font-medium hover:bg-secondary/10 border-t border-white/5 flex items-center gap-2"
                >
                  <CheckCircle size={16} /> 
                  Use "{searchTerm.trim()}"
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500 text-center flex flex-col items-center justify-center gap-2">
               <XCircle size={20} className="text-slate-600" />
               <span>No matches. Press Enter to use "{searchTerm.trim()}"</span>
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
          className="fixed inset-0 z-40"
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
    setSuccess('');
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
      setSuccess(`Shipment created successfully: ${shipment.source_location} -> ${shipment.destination_location}`);
      setShipments([...shipments, shipment]);
      
      // Keep previous cities but switch focus to requests tab to see it
      setTimeout(() => {
        setSuccess('');
        setTab('requests');
        handleLoadShipments();
      }, 2000);
    } catch (e) {
      setError(e.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadShipments = async () => {
    setLoading(true);
    setError('');
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
      <div className="min-h-screen flex text-white bg-background relative overflow-hidden">
        {/* Background Mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px] animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[150px] animate-blob" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto items-center">
            {/* Glassmorphism Card */}
            <div className="w-full max-w-md glass-panel p-8 sm:p-10 shadow-2xl">
              <div className="flex justify-center mb-8">
                <div className="bg-gradient-to-br from-primary to-purple-600 p-4 rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.4)] animate-pulse-glow">
                  <Package className="w-10 h-10 text-white drop-shadow-md" />
                </div>
              </div>
              <h2 className="text-3xl font-extrabold text-center text-white tracking-tight mb-2">Shipper Portal</h2>
              <p className="text-center text-slate-400 mb-8 font-medium">Log in to manage your shipments</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="shipper1@looplink.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full dark-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full dark-input"
                  />
                </div>
                
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-[#8b5cf6] hover:to-[#a855f7] text-white font-bold text-lg rounded-xl transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Log In Securely'}
                </button>
                
                {error && (
                  <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm rounded-xl flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /> 
                    <span className="font-medium">{error}</span>
                  </div>
                )}
                
                <div className="mt-8 text-center text-sm text-slate-400 glass-panel border-none p-4 bg-white/5">
                  <p className="mb-1 font-medium text-slate-300">Demo Credentials:</p>
                  <span className="px-2 py-1 rounded bg-black/40 font-mono text-secondary text-xs">shipper1@looplink.com</span>
                  <span className="mx-2 text-slate-500">/</span>
                  <span className="px-2 py-1 rounded bg-black/40 font-mono text-secondary text-xs">shipper123</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative font-sans text-white pb-12 flex flex-col overflow-x-hidden">
      {/* Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] animate-blob"></div>
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[150px] animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <header className="glass-nav sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-2.5 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(124,58,237,0.4)]">
                <Package className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                LoopLink
              </h1>
              <span className="ml-2 px-3 py-1 bg-white/5 border border-white/10 text-slate-300 text-xs font-bold rounded-lg tracking-widest uppercase">
                Shipper
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-3 pr-6 border-r border-white/10">
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-secondary p-[2px]">
                  <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">S1</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white leading-none">Shipper One</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Premium Tier</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="glass-nav sticky top-[72px] z-30 border-t-0 shadow-lg shadow-background/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center space-x-2 sm:space-x-4 py-4 overflow-x-auto hide-scrollbar">
            {[
              { id: 'create', label: 'Create Shipment', icon: PlusCircle },
              { id: 'requests', label: 'My Requests', icon: List },
              { id: 'accepted', label: 'Accepted Matches', icon: CheckCircle },
              { id: 'tracking', label: 'Live Tracking', icon: Map },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] scale-105'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      <div className="max-w-[780px] mx-auto px-4 sm:px-6 lg:px-8 w-full mt-8 relative z-20 empty:hidden">
        {success && (
           <div className="mb-6 p-4 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-fade-in-down backdrop-blur-md">
             <CheckCircle className="w-5 h-5 flex-shrink-0" />
             <span className="font-medium">{success}</span>
           </div>
        )}
        {error && (
           <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-fade-in-down backdrop-blur-md">
             <XCircle className="w-5 h-5 flex-shrink-0" />
             <span className="font-medium">{error}</span>
           </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[780px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
        {tab === 'create' && (
          <div className="max-w-[780px] mx-auto animate-fade-in-up">
            <div className="glass-panel shadow-[0_25px_50px_rgba(0,0,0,0.4)] overflow-hidden relative group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-purple-600 opacity-80 group-focus-within:h-1.5 transition-all"></div>
              
              <div className="px-8 py-8 border-b border-white/10 glass-panel">
                {/* Progress Indicator */}
                <div className="flex justify-center gap-2 mb-6">
                   <div className="w-8 h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary"></div>
                   <div className="w-8 h-1.5 rounded-full bg-white/10"></div>
                   <div className="w-8 h-1.5 rounded-full bg-white/10"></div>
                </div>
                
                <h2 className="text-3xl font-extrabold text-white flex items-center justify-center gap-4 tracking-tight drop-shadow-md">
                  <div className="bg-primary/20 p-2.5 rounded-2xl text-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <PlusCircle size={28} className="drop-shadow-sm" />
                  </div>
                  New Shipment
                </h2>
                <p className="text-slate-400 mt-3 text-center font-medium">Broadcast a fast, reliable freight request to our carrier network.</p>
              </div>
              
              <div className="p-8 space-y-10">
                 {/* Route Details */}
                 <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                   <h3 className="text-[13px] font-bold text-primary mb-6 uppercase tracking-widest flex items-center gap-3 border-l-2 border-primary pl-3 bg-gradient-to-r from-primary/10 to-transparent py-1">
                     <span className="section-icon-badge"><Map size={16} /></span> ROUTE SELECTION
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                     <SearchableSelect label="Origin Location" value={source} onChange={setSource} options={INDIA_CITIES} icon={MapPin} />
                     <div className="hidden md:flex absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 shrink-0 z-10 w-12 h-8 rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-[0_0_20px_rgba(124,58,237,0.5)] items-center justify-center animate-pulse">
                       <ArrowRight size={20} className="text-white drop-shadow-md" />
                     </div>
                     <SearchableSelect label="Destination Location" value={destination} onChange={setDestination} options={INDIA_CITIES} icon={MapPin} />
                   </div>
                 </div>
                 
                 {/* Load Details */}
                 <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                   <h3 className="text-[13px] font-bold text-primary mb-6 uppercase tracking-widest flex items-center gap-3 border-l-2 border-primary pl-3 bg-gradient-to-r from-primary/10 to-transparent py-1">
                     <span className="section-icon-badge"><Package size={16} /></span> CARGO SPECIFICATIONS
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                       <label className="block text-[13px] font-medium text-slate-400 mb-2 uppercase tracking-wide">Cargo Type</label>
                       <div className="relative group">
                         <Package className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary pointer-events-none group-focus-within:text-white transition-colors" size={18} />
                         <select
                           value={loadType}
                           onChange={(e) => setLoadType(e.target.value)}
                           className="w-full pl-11 pr-10 dark-input cursor-pointer appearance-none group"
                         >
                           <option className="bg-[#1E2130] text-white">Vegetables</option>
                           <option className="bg-[#1E2130] text-white">Fruits</option>
                           <option className="bg-[#1E2130] text-white">Dairy</option>
                           <option className="bg-[#1E2130] text-white">Seafood</option>
                           <option className="bg-[#1E2130] text-white">Pharma</option>
                           <option className="bg-[#1E2130] text-white">Frozen Foods</option>
                           <option className="bg-[#1E2130] text-white">Electronics</option>
                           <option className="bg-[#1E2130] text-white">General Freight</option>
                         </select>
                         <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-500 group-focus-within:text-secondary group-focus-within:-rotate-180 transition-all duration-300">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                         </div>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[13px] font-medium text-slate-400 mb-2 uppercase tracking-wide">Total Weight (kg)</label>
                       <div className="relative group">
                         <Weight className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary pointer-events-none group-focus-within:text-yellow-400 transition-colors" size={18} />
                         <input
                           type="number"
                           value={loadWeight}
                           onChange={(e) => setLoadWeight(Number(e.target.value))}
                           className="w-full pl-11 pr-4 dark-input"
                         />
                       </div>
                     </div>
                   </div>
                 </div>

                 {/* Storage & Payment Matrix */}
                 <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                   <h3 className="text-[13px] font-bold text-primary mb-6 uppercase tracking-widest flex items-center gap-3 border-l-2 border-primary pl-3 bg-gradient-to-r from-primary/10 to-transparent py-1">
                     <span className="section-icon-badge"><Thermometer size={16} /></span> LOGISTICS DETAILS
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div>
                       <label className="block text-[13px] font-medium text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                         Min Temp
                         <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] text-blue-400 bg-current"></div>
                       </label>
                       <div className="relative group">
                         <Thermometer className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 pointer-events-none" size={18} />
                         <input type="number" value={tempMin} onChange={(e) => setTempMin(Number(e.target.value))} className="w-full pl-11 pr-4 dark-input focus:border-blue-400 focus:ring-blue-400" />
                       </div>
                     </div>
                     <div>
                       <label className="block text-[13px] font-medium text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                         Max Temp
                         <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] text-red-500 bg-current"></div>
                       </label>
                       <div className="relative group">
                         <Thermometer className="absolute left-4 top-1/2 transform -translate-y-1/2 text-red-500 pointer-events-none" size={18} />
                         <input type="number" value={tempMax} onChange={(e) => setTempMax(Number(e.target.value))} className="w-full pl-11 pr-4 dark-input focus:border-red-500 focus:ring-red-500" />
                       </div>
                     </div>
                     <div>
                       <label className="block text-[13px] font-bold text-secondary mb-2 uppercase tracking-wide opacity-90 drop-shadow">Est. Payout</label>
                       <div className="relative group">
                         <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#10B981] drop-shadow-[0_0_5px_rgba(16,185,129,0.5)] font-bold text-xl pointer-events-none">₹</span>
                         <input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(Number(e.target.value))} className="w-full pl-10 pr-4 py-3.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-lg font-extrabold focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] text-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.15)] focus:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-200 outline-none" />
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
              
              <div className="px-8 py-6 border-t border-white/10 bg-white/[0.01] flex justify-end items-center gap-4">
                 <button 
                  onClick={handleCreateShipment} 
                  disabled={loading}
                  className="px-10 py-4 bg-gradient-to-r from-primary to-purple-600 hover:from-[#8b5cf6] hover:to-[#a855f7] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] flex items-center gap-3 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                 >
                   <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[0.6s]"></div>
                   {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Truck size={22} /> Broadcast Request</>}
                 </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div className="max-w-6xl mx-auto space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Your Broadcasted Requests</h2>
                <p className="text-slate-400 font-medium">Manage and track your active load postings</p>
              </div>
              <button
                onClick={handleLoadShipments}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 glass-panel text-white hover:bg-white/10 transition-all font-bold text-sm focus-glow"
              >
                <Loader2 size={18} className={loading ? "animate-spin text-primary" : "text-slate-400"} />
                {loading ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
            
            {shipments.length === 0 ? (
              <div className="glass-panel p-16 flex flex-col items-center justify-center text-center shadow-lg">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                  <Package className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-extrabold text-white mb-2">No active requests</h3>
                <p className="text-slate-400 font-medium max-w-sm mb-6">You haven't broadcasted any shipments yet. Create one to get started.</p>
                <button 
                  onClick={() => setTab('create')}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-[#8b5cf6] hover:to-[#a855f7] text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                >
                  <PlusCircle size={18} /> Create Shipment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {shipments.map((s) => (
                  <div key={s.id} className="glass-panel p-6 hover:bg-white/[0.04] hover:shadow-[0_0_25px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all duration-300 relative overflow-hidden flex flex-col h-full group">
                    {/* Top Accent Gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-primary/20 text-primary text-xs font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wide border border-primary/30">
                        {s.load_type}
                      </div>
                      <div className={`text-xs font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wide border ${
                        s.status === 'pending' || !s.status 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {s.status || 'pending'}
                      </div>
                    </div>
                    
                    <div className="space-y-5 flex-grow relative">
                      {/* Tracking Line */}
                      <div className="absolute top-[28px] left-[15px] bottom-[28px] w-0.5 bg-white/10 border-l-2 border-dashed border-slate-700 z-0"></div>
                      
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-slate-800 shadow-[0_0_10px_rgba(59,130,246,0.3)] flex items-center justify-center text-blue-400 flex-shrink-0">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_5px_currentColor]"></div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Pickup Location</p>
                          <p className="font-bold text-white text-lg leading-tight">{s.source_location}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 border-2 border-slate-800 shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center justify-center text-purple-400 flex-shrink-0">
                          <MapPin size={16} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Dropoff Location</p>
                          <p className="font-bold text-white text-lg leading-tight">{s.destination_location}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 space-y-1 bg-white/[0.02] rounded-2xl border border-white/[0.05] p-2">
                      <div className="flex justify-between items-center p-3 hover:bg-white/[0.03] rounded-xl transition-colors">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Weight size={15} />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Total Weight</span>
                        </div>
                        <span className="text-[15px] font-extrabold text-white">{s.load_weight}kg</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 hover:bg-white/[0.03] rounded-xl transition-colors">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Thermometer size={15} />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Temperature</span>
                        </div>
                        <span className="text-[15px] font-extrabold text-white">
                          {s.temperature_min !== undefined ? `${s.temperature_min}° - ${s.temperature_max}°` : (s.required_temp !== undefined && s.required_temp !== -1 ? `${s.required_temp}°C` : 'Any')}
                        </span>
                      </div>

                      <div className="flex justify-between items-center p-3 hover:bg-white/[0.03] rounded-xl transition-colors bg-white/[0.02]">
                        <div className="flex items-center gap-2 text-slate-400">
                          <DollarSign size={15} className="text-[#10B981]" />
                          <span className="text-[11px] font-bold uppercase tracking-widest">Est. Payout</span>
                        </div>
                        <span className="text-[16px] font-extrabold text-[#10B981] drop-shadow-[0_0_3px_rgba(16,185,129,0.3)]">₹{s.estimated_cost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'accepted' && (
          <div className="max-w-4xl mx-auto mt-12 animate-fade-in-up">
            <div className="glass-panel p-16 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="relative">
                  <div className="w-24 h-24 bg-[#10B981]/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle className="w-12 h-12 text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  </div>
                  <div className="absolute top-0 right-0 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-[#10B981]/50">
                    <Truck className="w-4 h-4 text-[#10B981]" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-3 tracking-tight">No Accepted Matches Yet</h3>
                <p className="text-slate-400 font-medium max-w-md text-lg">Accepted shipments will appear here once they are assigned by a carrier and confirmed by admin.</p>
            </div>
          </div>
        )}

        {tab === 'tracking' && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 sm:px-6 lg:px-8 sm:py-6">
             <TrackingPage />
          </div>
        )}
      </main>
    </div>
  );
}
