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
    const response = await this.request<{ vehicles: Vehicle[] }>('/drivers/me/vehicles');
    return response.vehicles;
  }

  // Matching endpoints
  async searchMatches(options?: { limit?: number }): Promise<{ matches: MatchResult[] }> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    const queryString = params.toString();
    const endpoint = queryString ? `/matching/search?${queryString}` : '/matching/search';
    return this.request(endpoint);
  }

  async acceptMatch(matchId: string): Promise<any> {
    return this.request('/matching/accept', {
      method: 'POST',
      body: JSON.stringify({ match_id: matchId }),
    });
  }

  async rejectMatch(matchId: string): Promise<any> {
    return this.request(`/matching/${matchId}/reject`, {
      method: 'POST',
    });
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
