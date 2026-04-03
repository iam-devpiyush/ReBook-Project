'use client';

/**
 * ShippingLabelDownload Component
 *
 * Displays the shipping label URL with a download button and pickup instructions.
 * Requirements: 7.4
 */

interface ShippingLabelDownloadProps {
  labelUrl: string;
  trackingId: string;
  courier: string;
  estimatedDeliveryDays: number;
  pickupInstructions: string;
}

export default function ShippingLabelDownload({
  labelUrl,
  trackingId,
  courier,
  estimatedDeliveryDays,
  pickupInstructions,
}: ShippingLabelDownloadProps) {
  return (
    <div className="space-y-4">
      {/* Label card */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏷️</span>
          <div className="flex-1">
            <p className="font-semibold text-green-800">Shipping Label Ready</p>
            <p className="text-sm text-green-700 mt-0.5">
              {courier} · Est. {estimatedDeliveryDays} day{estimatedDeliveryDays !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-green-600 font-mono mt-1">AWB: {trackingId}</p>
          </div>
        </div>
      </div>

      {/* Download button */}
      <a
        href={labelUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={`shipping-label-${trackingId}.pdf`}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
      >
        <span>⬇️</span> Download Shipping Label (PDF)
      </a>

      {/* Pickup instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 Pickup Instructions</p>
        <p>{pickupInstructions}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2 text-sm text-gray-600">
        <p className="font-medium text-gray-700">What to do next:</p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Print the shipping label above</li>
          <li>Pack the book securely in a box or bubble wrap</li>
          <li>Attach the label clearly on the outside</li>
          <li>Keep the package ready for courier pickup</li>
        </ol>
      </div>
    </div>
  );
}
