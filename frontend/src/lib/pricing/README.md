# Enhanced Pricing Engine

The Enhanced Pricing Engine calculates final book prices including all cost components: base price with condition multipliers, real-time delivery costs from shipping APIs, platform commission, and payment gateway fees.

## Features

- **Condition-Based Pricing**: Applies multipliers based on book condition (1-5 scale)
- **Real-Time Delivery Costs**: Fetches actual shipping costs from Delhivery/Shiprocket APIs
- **Transparent Breakdown**: Shows all cost components separately
- **Seller Payout Calculation**: Calculates net earnings for sellers
- **Fallback Handling**: Uses cached estimates when shipping APIs are unavailable

## Usage

### Calculate Pricing

```typescript
import { calculateEnhancedPricing } from '@/lib/pricing';

const pricing = await calculateEnhancedPricing(
  500,  // original price
  4,    // condition score (1-5)
  {     // seller location
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  },
  {     // buyer location
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
  0.5   // weight in kg (optional, default: 0.5)
);

console.log(pricing);
// {
//   original_price: 500,
//   condition_score: 4,
//   condition_multiplier: 0.70,
//   base_price: 350,
//   delivery_cost: 120,
//   platform_commission: 35,
//   payment_fees: 11.75,
//   final_price: 517,
//   seller_payout: 315
// }
```

### API Route

```typescript
// POST /api/pricing/calculate
const response = await fetch('/api/pricing/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    original_price: 500,
    condition_score: 4,
    seller_location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    buyer_location: {
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  }),
});

const { data } = await response.json();
```

## Pricing Formula

```
base_price = original_price × condition_multiplier
delivery_cost = from shipping API (Delhivery/Shiprocket)
platform_commission = base_price × 0.10
payment_fees = (base_price × 0.025) + 3.00
final_price = base_price + delivery_cost + platform_commission + payment_fees
seller_payout = base_price - platform_commission
```

## Condition Multipliers

| Score | Condition   | Multiplier |
|-------|-------------|------------|
| 5     | Like New    | 0.80 (80%) |
| 4     | Very Good   | 0.70 (70%) |
| 3     | Good        | 0.60 (60%) |
| 2     | Acceptable  | 0.40 (40%) |
| 1     | Poor        | 0.25 (25%) |

## Shipping API Integration

The pricing engine integrates with shipping APIs to fetch real-time delivery costs:

1. **Primary API**: Delhivery
2. **Fallback API**: Shiprocket
3. **Cache**: 1-hour TTL for delivery cost estimates
4. **Fallback Calculation**: Distance-based estimates when APIs are unavailable

### Fallback Estimates

- Same city: ₹50 base
- Same state: ₹80 base
- Different state: ₹120 base
- Weight surcharge: ₹10 per 0.5kg above 0.5kg

## Error Handling

The pricing engine handles errors gracefully:

- Invalid inputs throw descriptive errors
- Shipping API failures fall back to cached estimates
- All calculations are validated before returning

## Testing

The pricing engine includes comprehensive property-based tests:

```bash
npm test -- src/lib/pricing/__tests__/pricing-formula.property.test.ts
npm test -- src/lib/pricing/__tests__/seller-payout.property.test.ts
```

## Requirements Validated

- **4.1-4.10**: Enhanced Pricing Calculation
- **7.1, 7.2**: Shipping API Integration
- **19.4**: Error Handling with Fallback

## Files

- `pricing-engine.ts`: Core pricing calculation logic
- `shipping-api.ts`: Shipping API integration with fallback
- `__tests__/pricing-formula.property.test.ts`: Property-based tests for pricing formula
- `__tests__/seller-payout.property.test.ts`: Property-based tests for seller payout
- `route.ts`: API route for pricing calculation
