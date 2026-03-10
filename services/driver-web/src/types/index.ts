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
  license_plate: string;
  vehicle_type: string;
  capacity: number;
  temperature_min?: number;
  temperature_max?: number;
  current_location: string;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Shipment {
  id: string;
  shipper_id: string;
  source: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight: number;
  temperature_min: number;
  temperature_max: number;
  description: string;
  estimated_cost?: number;
  actual_cost?: number;
  status?: string;
  shipper?: Shipper;
  created_at?: string;
  updated_at?: string;
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
  capacity: number;
  temperature_min: number;
  temperature_max: number;
  current_location: string;
}

export interface UpdateVehicleRequest {
  license_plate?: string;
  vehicle_type?: string;
  capacity?: number;
  temperature_min?: number;
  temperature_max?: number;
  current_location?: string;
}
