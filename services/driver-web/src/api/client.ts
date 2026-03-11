import type {
  User,
  AuthResponse,
  LoginRequest,
  SignupRequest,
  CreateDriverRequest,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  Driver,
  Vehicle,
  Shipment,
  MatchResult,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<User> {
    const response = await this.request<AuthResponse>('/public/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response.user;
  }

  async signup(data: SignupRequest): Promise<User> {
    const response = await this.request<AuthResponse>('/public/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response.user;
  }

  async getProfile(): Promise<User> {
    return this.request('/auth/profile');
  }

  // Driver endpoints
  async registerDriver(data: CreateDriverRequest): Promise<Driver> {
    const response = await this.request<{ driver: Driver }>('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.driver;
  }

  async getMyDriverProfile(): Promise<Driver> {
    const response = await this.request<{ driver: Driver }>('/drivers/me');
    return response.driver;
  }

  async getMyProfile(): Promise<Driver> {
    return this.getMyDriverProfile();
  }

  async updateMyDriverProfile(data: Partial<Driver>): Promise<Driver> {
    const response = await this.request<{ driver: Driver }>('/drivers/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.driver;
  }

  async getDriver(id: string): Promise<Driver> {
    const response = await this.request<{ driver: Driver }>(`/drivers/${id}`);
    return response.driver;
  }

  // Vehicle endpoints
  async createVehicle(data: CreateVehicleRequest): Promise<Vehicle> {
    const response = await this.request<{ vehicle: Vehicle }>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.vehicle;
  }

  async listVehicles(): Promise<Vehicle[]> {
    const response = await this.request<{ vehicles: Vehicle[] }>('/vehicles');
    return response.vehicles;
  }

  async getAvailableVehicles(): Promise<Vehicle[]> {
    const response = await this.request<{ vehicles: Vehicle[] }>('/vehicles/available');
    return response.vehicles;
  }

  async getVehicle(id: string): Promise<Vehicle> {
    const response = await this.request<{ vehicle: Vehicle }>(`/vehicles/${id}`);
    return response.vehicle;
  }

  async updateVehicle(
    id: string,
    data: UpdateVehicleRequest
  ): Promise<Vehicle> {
    const response = await this.request<{ vehicle: Vehicle }>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.vehicle;
  }

  async deleteVehicle(id: string): Promise<{ message: string }> {
    return this.request(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  async getDriverVehicles(): Promise<Vehicle[]> {
    // Get current driver's ID first
    const driverResponse = await this.request<{ driver: Driver }>('/drivers/me');
    const driver = driverResponse.driver;
    // Then fetch their vehicles
    const response = await this.request<{ vehicles: Vehicle[] }>(`/drivers/${driver.id}/vehicles`);
    return response.vehicles;
  }

  // Shipment endpoints (for finding matches)
  async listShipments(): Promise<Shipment[]> {
    const response = await this.request<{ shipments: Shipment[] }>('/shipments');
    return response.shipments;
  }

  async getShipment(id: string): Promise<Shipment> {
    const response = await this.request<{ shipment: Shipment }>(`/shipments/${id}`);
    return response.shipment;
  }

  // Matching endpoints - Real backend contract
  async findMatches(shipmentId: string, limit: number = 10): Promise<MatchResult[]> {
    const response = await this.request<{ matches: MatchResult[] }>(`/shipments/${shipmentId}/matches`);
    return response.matches.slice(0, limit);
  }

  async searchMatches(options?: { limit?: number }): Promise<{ matches: MatchResult[] }> {
    // Legacy method - get all available shipments and find matches for each
    const shipments = await this.listShipments();
    if (shipments.length === 0) {
      return { matches: [] };
    }
    // Get matches for first shipment (or could iterate through all)
    const matches = await this.findMatches(shipments[0].id, options?.limit || 20);
    return { matches };
  }

  async acceptMatch(shipmentId: string, vehicleId: string, matchScore: number, estimatedCost: number): Promise<any> {
    const driverResponse = await this.request<{ driver: Driver }>('/drivers/me');
    const driver = driverResponse.driver;
    return this.request('/matching/accept', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentId,
        vehicle_id: vehicleId,
        driver_id: driver.id,
        match_score: matchScore,
        estimated_cost: estimatedCost,
      }),
    });
  }

  async rejectMatch(): Promise<any> {
    // Backend doesn't have reject endpoint, return success
    return { success: true, message: 'Match rejected' };
  }

  async submitFeedback(shipmentId: string, rating: number, comment: string): Promise<any> {
    return this.request('/matching/feedback', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: shipmentId,
        rating,
        comment,
      }),
    });
  }

  async getBackhauling(shipmentId: string): Promise<{ opportunities: Shipment[] }> {
    return this.request(`/matching/backhauling/${shipmentId}`);
  }
}

export const apiClient = new ApiClient();
