# Listing Components

This directory contains components for creating and displaying book listings in the marketplace.

## Components

### CreateListingForm

Multi-step form for creating book listings with AI scanner integration.

**Features:**
- Step 1: AI-powered book scanning with ISBN detection
- Step 2: Book details entry (auto-filled or manual)
- Step 3: Condition and pricing review
- Step 4: Confirmation and submission

**Usage:**
```tsx
import CreateListingForm from '@/components/listings/CreateListingForm';

function CreateListingPage() {
  return <CreateListingForm />;
}
```

**Requirements:** 2.1-2.12

---

### ConditionBadge

Displays book condition score with color-coded visual indicators.

**Props:**
- `conditionScore` (number, required): Condition score from 1-5
- `size` ('sm' | 'md' | 'lg', optional): Badge size, defaults to 'md'
- `showLabel` (boolean, optional): Show condition label, defaults to true

**Condition Mapping:**
- 5: Like New (green)
- 4: Very Good (lime)
- 3: Good (yellow)
- 2: Acceptable (orange)
- 1: Poor (red)

**Usage:**
```tsx
import ConditionBadge from '@/components/listings/ConditionBadge';

<ConditionBadge conditionScore={4} size="lg" />
```

**Requirements:** Condition display

---

### PricingBreakdownDisplay

Shows complete pricing breakdown with all cost components.

**Props:**
- `pricing` (PricingBreakdown, required): Pricing breakdown object
- `showSellerPayout` (boolean, optional): Show seller payout section, defaults to false
- `variant` ('default' | 'compact', optional): Display variant, defaults to 'default'

**Displays:**
- Original price
- Base price with condition multiplier
- Delivery cost
- Platform commission (10%)
- Payment gateway fees
- Final price (prominently displayed)
- Seller payout (if enabled)

**Usage:**
```tsx
import PricingBreakdownDisplay from '@/components/listings/PricingBreakdownDisplay';

<PricingBreakdownDisplay 
  pricing={pricingBreakdown} 
  showSellerPayout={true}
  variant="default"
/>
```

**Requirements:** 4.8, 4.9, 4.10

---

## Testing

All components have comprehensive unit tests:

```bash
# Run all listing component tests
npm test -- listings

# Run specific component tests
npm test -- ConditionBadge.test
npm test -- PricingBreakdownDisplay.test
npm test -- CreateListingForm.test
```

## Integration

The CreateListingForm integrates with:
- **EnhancedAIScanner**: For image capture and AI analysis
- **Pricing API** (`/api/pricing/calculate`): For real-time pricing calculation
- **Listing API** (`/api/listings`): For listing creation
- **react-hook-form**: For form state management
- **Zod**: For validation

## Form Flow

1. **Scan Book**: User captures 4 images (front, back, spine, pages)
2. **AI Analysis**: System detects ISBN, fetches metadata, analyzes condition
3. **Auto-fill**: Form is populated with detected data
4. **Manual Entry**: User can edit or add missing information
5. **Pricing**: System calculates final price with all costs
6. **Review**: User reviews condition and pricing
7. **Submit**: Listing is created with status "pending_approval"

## Validation

All form inputs are validated using Zod schemas:
- Title, author, category: Required
- Original price: Positive number
- Condition score: Integer 1-5
- Pincode: 6-digit Indian pincode
- Images: 1-10 URLs

## Styling

Components use Tailwind CSS with consistent design:
- Color-coded condition indicators
- Responsive layouts
- Clear visual hierarchy
- Accessible form controls
