import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function RegisterDriver() {
  const navigate = useNavigate()
  const { refreshDriver } = useAuth()
  const [form, setForm] = useState({ license_number: '', phone_number: '', role: 'transporting_body' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (key, val) => setForm({ ...form, [key]: val })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.registerDriver(form)
      await refreshDriver()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900">🚚 Driver Registration</h1>
          <p className="text-gray-500 mt-2">Complete your driver profile</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
          <input
            value={form.license_number}
            onChange={(e) => set('license_number', e.target.value)}
            required
            placeholder="MH-12-2024-001234"
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            value={form.phone_number}
            onChange={(e) => set('phone_number', e.target.value)}
            required
            placeholder="+91 9876543210"
            className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className="w-full px-4 py-2 mb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="transporting_body">Transporting Body</option>
            <option value="help_seeking_body">Help Seeking Body</option>
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  )
}
