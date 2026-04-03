'use client';

/**
 * TrackingDisplay Component
 *
 * Shows live shipment tracking status, timeline, and estimated delivery.
 * Requirements: 7.8
 */

import { useEffect, useState } from 'react';
import type { ShipmentStatus, ShipmentStatusCode } from '@/services/shipping.service';

interface TrackingDisplayProps {
  trackingId: string;
  courier?: string;
}

const STATUS_STEPS: ShipmentStatusCode[] = [
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
];

const STATUS_LABELS: Record<ShipmentStatusCode, string> = {
  pending: 'Order Placed',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Delivery Failed',
};

const STATUS_ICONS: Record<ShipmentStatusCode, string> = {
  pending: '📦',
  picked_up: '🚚',
  in_transit: '✈️',
  out_for_delivery: '🛵',
  delivered: '✅',
  failed: '❌',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function TrackingDisplay({ trackingId, courier }: TrackingDisplayProps) {
  const [status, setStatus] = useState<ShipmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingId) return;
    setLoading(true);
    fetch(`/api/shipping/track/${encodeURIComponent(trackingId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStatus(json.data);
        else setError(json.error ?? 'Failed to fetch tracking info');
      })
      .catch(() => setError('Failed to fetch tracking info'))
      .finally(() => setLoading(false));
  }, [trackingId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
        Loading tracking info...
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="text-sm text-red-600 py-2">{error ?? 'Tracking info unavailable'}</div>
    );
  }

  const isFailed = status.status === 'failed';
  const currentStepIdx = isFailed ? -1 : STATUS_STEPS.indexOf(status.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Tracking ID</p>
          <p className="font-mono text-sm font-semibold text-gray-900">{trackingId}</p>
          {courier && <p className="text-xs text-gray-500 mt-0.5">via {courier}</p>}
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            isFailed
              ? 'bg-red-100 text-red-700'
              : status.status === 'delivered'
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {STATUS_ICONS[status.status]} {STATUS_LABELS[status.status]}
          </span>
        </div>
      </div>

      {/* Current location */}
      {status.currentLocation && (
        <p className="text-sm text-gray-600">
          📍 {status.currentLocation}
        </p>
      )}

      {/* Estimated delivery */}
      {!isFailed && status.status !== 'delivered' && (
        <p className="text-sm text-gray-600">
          🗓 Estimated delivery: <span className="font-medium">{formatDate(status.estimatedDelivery)}</span>
        </p>
      )}

      {/* Progress stepper */}
      {!isFailed && (
        <div className="flex items-center gap-0 mt-2">
          {STATUS_STEPS.map((step, idx) => {
            const done = idx <= currentStepIdx;
            const active = idx === currentStepIdx;
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    done
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  } ${active ? 'ring-2 ring-blue-200' : ''}`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center leading-tight max-w-[56px] ${
                    done ? 'text-blue-600 font-medium' : 'text-gray-400'
                  }`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
                {idx < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 ${done && idx < currentStepIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Event timeline */}
      {status.events.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Timeline</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {status.events.map((event, idx) => (
              <div key={idx} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  {idx < status.events.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="pb-2">
                  <p className="text-gray-800">{event.description}</p>
                  {event.location && (
                    <p className="text-xs text-gray-500">{event.location}</p>
                  )}
                  <p className="text-xs text-gray-400">{formatDate(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
