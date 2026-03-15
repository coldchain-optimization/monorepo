import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function MyProfile() {
  const { user, driver, refreshDriver } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    license_number: driver?.license_number || '',
    phone_number: driver?.phone_number || '',
    role: driver?.role || 'transporting_body',
    is_active: driver?.is_active ?? true,
  })
  const [msg, setMsg] = useState('')

  const set = (key, val) => setForm({ ...form, [key]: val })

  const handleSave = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await api.updateDriverProfile(form)
      await refreshDriver()
      setEditing(false)
      setMsg('Profile updated successfully!')
    } catch (err) {
      setMsg('Error: ' + err.message)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>

      {msg && (
        <div className={`p-3 rounded-lg mb-4 text-sm ${msg.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {msg}
        </div>
      )}

      {/* User Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Account Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Name</p>
            <p className="font-medium">{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <p className="text-gray-400">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-400">Role</p>
            <p className="font-medium capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-gray-400">Member Since</p>
            <p className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</p>
          </div>
        </div>
      </div>

      {/* Driver Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Driver Profile</h3>
          {!editing && driver && (
            <button onClick={() => setEditing(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition">
              Edit
            </button>
          )}
        </div>

        {!driver ? (
          <p className="text-gray-500">No driver profile found. Register as a driver first.</p>
        ) : !editing ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">License Number</p>
              <p className="font-medium">{driver.license_number}</p>
            </div>
            <div>
              <p className="text-gray-400">Phone</p>
              <p className="font-medium">{driver.phone_number}</p>
            </div>
            <div>
              <p className="text-gray-400">Driver Role</p>
              <p className="font-medium capitalize">{driver.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-400">Rating</p>
              <p className="font-medium">⭐ {driver.rating?.toFixed(1) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${driver.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {driver.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
              <input value={form.license_number} onChange={(e) => set('license_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone_number} onChange={(e) => set('phone_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={(e) => set('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="transporting_body">Transporting Body</option>
                <option value="help_seeking_body">Help Seeking Body</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                Save Changes
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
