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
      return 'bg-emerald-500/10 border-emerald-500/30';
    case 'in_transit':
      return 'bg-blue-500/10 border-blue-500/30';
    case 'delivered':
      return 'bg-emerald-500/10 border-emerald-500/30';
    default:
      return 'bg-white/5 border-gray-500/30';
  }
};

const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'pickup':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    case 'in_transit':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case 'delivered':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    default:
      return 'bg-white/10 text-gray-300 border border-white/20';
  }
};

export default function StatusTimeline({ events, currentStatus }) {
  if (events.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-lg font-bold text-white mb-4">Status History</h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-gray-400">No status events recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
      <h3 className="text-lg font-bold text-white mb-6">Status Timeline</h3>
      <div className="space-y-4">
        {events.map((event, idx) => (
          <div key={event.id} className="relative">
            {/* Vertical connector line */}
            {idx < events.length - 1 && (
              <div className="absolute left-6 top-12 w-1 h-8 bg-gradient-to-b from-white/20 to-white/5" />
            )}

            {/* Event card */}
            <div className={`flex gap-4 border border-y-white/5 border-r-white/5 border-l-4 rounded-xl p-4 backdrop-blur-md transition-all ${getStatusColor(event.status)}`}>
              {/* Icon circle */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#0F1117] border-2 border-white/20 flex items-center justify-center flex-shrink-0">
                  {getStatusIcon(event.status)}
                </div>
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white capitalize">
                      {event.status.replace('_', ' ')}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(event.status)}`}>
                      {event.status === 'in_transit' ? 'In Progress' : 'Completed'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Event description */}
                <p className="text-sm text-gray-300 mb-2">{event.description}</p>

                {/* Location details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">📍 Location:</span>
                    <p className="font-medium text-white">{event.location}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">🧭 Coordinates:</span>
                    <p className="font-medium text-white">
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
                      className="h-24 w-24 object-cover rounded-lg border border-white/20"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Status</p>
            <p className="text-lg font-bold text-white capitalize">{currentStatus.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Events Recorded</p>
            <p className="text-lg font-bold text-violet-400">{events.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
