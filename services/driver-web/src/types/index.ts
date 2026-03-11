// Auth types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'driver' | 'shipper' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry?: string;
  phone?: string;
  years_of_experience?: number;
  rating?: number;
  num_vehicles?: number;
  total_earnings?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  driver_id: string;
  vehicle_type: string;
  license_plate: string;
  manufacturer: string;
  model: string;
  year: number;
  capacity: number;
  max_weight: number;
  is_refrigerated: boolean;
  temperature: number;
  fuel_type: string;
  carbon_footprint: number;
  is_available: boolean;
  current_location: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  shipper_id: string;
  source_location: string;
  destination_location: string;
  load_weight: number;
  load_volume: number;
  load_type: string;
  required_temp: number;
  days_available: number;
  time_window_start: string;
  time_window_end: string;
  status: string;
  assigned_vehicle?: string;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
  updated_at: string;
  shipper?: Shipper;
}

export interface Shipper {
  id: string;
  user_id: string;
  company_name: string;
  phone: string;
  user?: User;
}

export interface MatchResult {
  id: string;
  shipment_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  match_score: number;
  estimated_cost?: number;
  estimated_time?: number;
  reasons?: string[];
  shipment?: Shipment;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface CreateDriverRequest {
  license_number: string;
  license_expiry: string;
  phone: string;
  years_of_experience: number;
}

export interface CreateVehicleRequest {
  license_plate: string;
  vehicle_type: string;
  manufacturer: string;
  model: string;
  year: number;
  capacity: number;
  max_weight: number;
  is_refrigerated: boolean;
  temperature: number;
  fuel_type: string;
  carbon_footprint: number;
  current_location: string;
}

export interface UpdateVehicleRequest {
  license_plate?: string;
  vehicle_type?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  capacity?: number;
  max_weight?: number;
  is_refrigerated?: boolean;
  temperature?: number;
  fuel_type?: string;
  carbon_footprint?: number;
  current_location?: string;
}
