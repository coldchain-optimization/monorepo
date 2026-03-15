const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token')
  }

  getToken() {
    return this.token
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const opts = { method, headers }
    if (body) {
      opts.body = JSON.stringify(body)
    }

    const res = await fetch(`${API_BASE}${path}`, opts)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Request failed')
    }
    return data
  }

  // Auth
  async signup(data) {
    const res = await this.request('POST', '/public/auth/signup', data)
    this.setToken(res.token)
    return res
  }

  async login(email, password) {
    const res = await this.request('POST', '/public/auth/login', { email, password })
    this.setToken(res.token)
    return res
  }

  async getProfile() {
    return this.request('GET', '/auth/profile')
  }

  // Driver
  async registerDriver(data) {
    return this.request('POST', '/drivers', data)
  }

  async getDriverProfile() {
    return this.request('GET', '/drivers/me')
  }

  async updateDriverProfile(data) {
    return this.request('PUT', '/drivers/me', data)
  }

  async getDriverVehicles(driverId) {
    return this.request('GET', `/drivers/${encodeURIComponent(driverId)}/vehicles`)
  }

  // Vehicles
  async createVehicle(data) {
    return this.request('POST', '/vehicles', data)
  }

  async listVehicles(driverId) {
    const query = driverId ? `?driver_id=${encodeURIComponent(driverId)}` : ''
    return this.request('GET', `/vehicles${query}`)
  }

  async getAvailableVehicles() {
    return this.request('GET', '/vehicles/available')
  }

  async getVehicle(id) {
    return this.request('GET', `/vehicles/${encodeURIComponent(id)}`)
  }

  async updateVehicle(id, data) {
    return this.request('PUT', `/vehicles/${encodeURIComponent(id)}`, data)
  }

  async deleteVehicle(id) {
    return this.request('DELETE', `/vehicles/${encodeURIComponent(id)}`)
  }

  // Shipments
  async getAvailableShipments() {
    return this.request('GET', '/shipments/available')
  }

  async getShipments() {
    return this.request('GET', '/shipments')
  }

  async getShipment(id) {
    return this.request('GET', `/shipments/${encodeURIComponent(id)}`)
  }

  // Matching
  async searchMatches(shipmentId, limit = 10) {
    return this.request('POST', '/matching/search', { shipment_id: shipmentId, limit })
  }

  async acceptMatch(data) {
    return this.request('POST', '/matching/accept', data)
  }

  async submitFeedback(data) {
    return this.request('POST', '/matching/feedback', data)
  }

  async getBackhauling(shipmentId) {
    return this.request('GET', `/matching/backhauling/${encodeURIComponent(shipmentId)}`)
  }

  // Consolidation
  async getConsolidationOpportunities(shipmentId) {
    return this.request('GET', `/consolidations/${encodeURIComponent(shipmentId)}`)
  }

  async createConsolidatedTrip(data) {
    return this.request('POST', '/consolidations', data)
  }

  async getBackhaulOpportunities(tripId) {
    return this.request('GET', `/trips/${encodeURIComponent(tripId)}/backhauling`)
  }

  async getConsolidationMetrics() {
    return this.request('GET', '/consolidations/metrics')
  }

  // Tracking
  async getTrackingStatus(shipmentId) {
    return this.request('GET', `/tracking/${encodeURIComponent(shipmentId)}/status`)
  }

  async getTrackingHistory(shipmentId) {
    return this.request('GET', `/tracking/${encodeURIComponent(shipmentId)}/history`)
  }

  // Status Events
  async getStatusHistory(shipmentId) {
    return this.request('GET', `/status/${encodeURIComponent(shipmentId)}/history`)
  }

  async getCurrentStatus(shipmentId) {
    return this.request('GET', `/status/${encodeURIComponent(shipmentId)}/current`)
  }

  async getStatusSummary(shipmentId) {
    return this.request('GET', `/status/${encodeURIComponent(shipmentId)}/summary`)
  }

  async recordPickupEvent(shipmentId, data) {
    return this.request('POST', `/status/${encodeURIComponent(shipmentId)}/pickup`, data)
  }

  async recordDeliveryEvent(shipmentId, data) {
    return this.request('POST', `/status/${encodeURIComponent(shipmentId)}/deliver`, data)
  }

  // Generic request methods
  async get(path) {
    return this.request('GET', path)
  }

  async post(path, data) {
    return this.request('POST', path, data)
  }
}

export const api = new ApiClient()
