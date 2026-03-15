import { CheckCircle, Clock, MapPin, AlertCircle } from 'lucide-react';

const getStatusIcon = (status) => {
  switch (status) {
    case 'pickup':
      return <MapPin className="h-5 w-5 text-green-600" />;
    case 'in_transit':
      return <Clock className="h-5 w-5 text-blue-600" />;
    case 'delivered':
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-600" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pickup':
      return 'bg-green-50 border-green-500';
    case 'in_transit':
      return 'bg-blue-50 border-blue-500';
    case 'delivered':
      return 'bg-emerald-50 border-emerald-500';
    default:
      return 'bg-gray-50 border-gray-500';
  }
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'pickup':
      return 'bg-green-100 text-green-800';
    case 'in_transit':
      return 'bg-blue-100 text-blue-800';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function StatusTimeline({ events, currentStatus }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Status History</h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No status events recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Status Timeline</h3>
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={event.id} className="relative">
            {/* Vertical connector line */}
            {idx < events.length - 1 && (
              <div className="absolute left-6 top-12 w-1 h-8 bg-gradient-to-b from-gray-300 to-gray-200" />
            )}

            {/* Event card */}
            <div className={`flex gap-4 bg-white border-l-4 rounded-lg p-4 transition-all ${getStatusColor(event.status)}`}>
              {/* Icon circle */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                  {getStatusIcon(event.status)}
                </div>
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 capitalize">
                      {event.status.replace('_', ' ')}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(event.status)}`}>
                      {event.status === 'in_transit' ? 'In Progress' : 'Completed'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Event description */}
                <p className="text-sm text-gray-700 mb-2">{event.description}</p>

                {/* Location details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">📍 Location:</span>
                    <p className="font-medium text-gray-900">{event.location}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">🧭 Coordinates:</span>
                    <p className="font-medium text-gray-900">
                      {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Proof image if available */}
                {event.proof_image && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">📸 Proof of Delivery:</p>
                    <img
                      src={event.proof_image}
                      alt="Delivery Proof"
                      className="h-24 w-24 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Status</p>
            <p className="text-lg font-bold text-gray-900 capitalize">{currentStatus.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Events Recorded</p>
            <p className="text-lg font-bold text-indigo-600">{events.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
