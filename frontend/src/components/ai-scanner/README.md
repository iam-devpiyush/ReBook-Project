# AI Scanner Components

This directory contains the frontend components for the AI-powered book scanner feature.

## Components

### EnhancedAIScanner

The main AI scanner component that orchestrates the entire scanning workflow.

**Features:**
- Platform detection (desktop vs mobile)
- QR code generation for desktop users
- Direct camera access for mobile users
- Image capture for 4 book sections (front cover, back cover, spine, pages)
- Image upload to Supabase Storage
- Real-time progress updates via Supabase Realtime
- ISBN detection and metadata display
- Condition analysis results

**Props:**
```typescript
interface EnhancedAIScannerProps {
  onComplete?: (result: ScanResult, imageUrls: Record<ImageType, string>) => void;
  onCancel?: () => void;
}
```

**Usage:**
```tsx
import { EnhancedAIScanner } from '@/components/ai-scanner';

function CreateListingPage() {
  const handleScanComplete = (result, imageUrls) => {
    // Auto-fill listing form with detected data
    console.log('ISBN:', result.detected_isbn);
    console.log('Metadata:', result.book_metadata);
    console.log('Condition:', result.condition_analysis);
  };

  return <EnhancedAIScanner onComplete={handleScanComplete} />;
}
```

### QRCodeGenerator

Generates a QR code for mobile camera access from desktop.

**Features:**
- Generates QR code with mobile camera URL
- Displays URL for manual entry
- Copy-to-clipboard functionality
- Instructions for scanning

**Props:**
```typescript
interface QRCodeGeneratorProps {
  scanId: string;
  onMobileConnected?: () => void;
}
```

**Usage:**
```tsx
import { QRCodeGenerator } from '@/components/ai-scanner';

function DesktopScanView() {
  const scanId = 'unique-scan-id';
  
  return <QRCodeGenerator scanId={scanId} />;
}
```

### CameraCapture

Handles device camera access and image capture.

**Features:**
- Opens device camera (back camera on mobile)
- Captures high-quality images (up to 1920x1080)
- Shows live camera preview
- Image preview after capture
- Retake functionality
- Type-specific instructions

**Props:**
```typescript
interface CameraCaptureProps {
  imageType: 'front_cover' | 'back_cover' | 'spine' | 'pages';
  onCapture: (file: File, preview: string) => void;
  onCancel: () => void;
}
```

**Usage:**
```tsx
import { CameraCapture } from '@/components/ai-scanner';

function CaptureView() {
  const handleCapture = (file, preview) => {
    console.log('Captured:', file.name);
    // Upload file or store for later
  };

  return (
    <CameraCapture
      imageType="front_cover"
      onCapture={handleCapture}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

## Workflow

### Desktop Flow

1. User opens scanner on desktop
2. `EnhancedAIScanner` detects desktop platform
3. `QRCodeGenerator` displays QR code
4. User scans QR code with mobile device
5. Mobile browser opens with camera interface
6. User captures 4 images using `CameraCapture`
7. Images are uploaded to Supabase Storage
8. AI analysis begins with real-time progress updates
9. Results are displayed (ISBN, metadata, condition)

### Mobile Flow

1. User opens scanner on mobile
2. `EnhancedAIScanner` detects mobile platform
3. "Start Camera" button is displayed
4. User taps button to open `CameraCapture`
5. User captures 4 images sequentially
6. Images are uploaded to Supabase Storage
7. AI analysis begins with real-time progress updates
8. Results are displayed (ISBN, metadata, condition)

## Requirements Mapping

- **Requirement 2.1**: Desktop users get QR code for mobile camera access
  - Implemented in `EnhancedAIScanner` (platform detection) and `QRCodeGenerator`

- **Requirement 2.2**: Mobile users get direct camera access
  - Implemented in `EnhancedAIScanner` (platform detection) and `CameraCapture`

- **Requirement 2.3**: Capture front cover, back cover, spine, and pages
  - Implemented in `EnhancedAIScanner` (image sequence) and `CameraCapture`

- **Requirement 2.11**: Real-time progress updates at 0%, 25%, 50%, 75%, 100%
  - Implemented in `EnhancedAIScanner` (Supabase Realtime subscription)

## API Integration

### Image Upload

```typescript
POST /api/listings/images
Content-Type: multipart/form-data

Body:
- listingId: string
- front_cover: File
- back_cover: File
- spine: File
- pages: File

Response:
{
  success: true,
  images: [
    {
      imageType: "front_cover",
      sizes: {
        thumbnail: "url",
        medium: "url",
        full: "url"
      }
    },
    // ... other images
  ]
}
```

### AI Scan

```typescript
POST /api/ai/scan
Content-Type: application/json

Body:
{
  scan_id: "uuid",
  images: {
    front_cover: "url",
    back_cover: "url",
    spine: "url",
    pages: "url"
  }
}

Response:
{
  success: true,
  result: {
    scan_id: "uuid",
    detected_isbn: "9780134685991",
    book_metadata: {
      title: "Effective Java",
      author: "Joshua Bloch",
      publisher: "Addison-Wesley",
      publication_year: 2018
    },
    condition_analysis: {
      cover_damage: 4,
      page_quality: 4,
      binding_quality: 4,
      markings: 5,
      discoloration: 4,
      overall_score: 4,
      confidence: 0.85,
      notes: "Book is in very good condition"
    }
  }
}
```

### Real-time Progress

The scanner subscribes to Supabase Realtime for progress updates:

```typescript
supabase
  .channel(`ai-scan-${scanId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'ai_scans',
    filter: `id=eq.${scanId}`
  }, (payload) => {
    // Update progress UI
    const { progress_percentage, scan_status } = payload.new;
  })
  .subscribe();
```

## Testing

Run tests:
```bash
npm test -- src/components/ai-scanner/__tests__
```

Test coverage:
- Platform detection (desktop/mobile)
- Image capture flow
- QR code generation
- Camera access and capture
- Upload and scan process
- Error handling
- Real-time progress updates

## Dependencies

- `react-qr-code`: QR code generation
- `@supabase/supabase-js`: Supabase client for Realtime
- `uuid`: Unique ID generation

## Browser Compatibility

- **Camera Access**: Requires `navigator.mediaDevices.getUserMedia` support
- **QR Code**: Works in all modern browsers
- **WebSocket**: Required for real-time updates

## Mobile Considerations

- Uses `facingMode: 'environment'` to prefer back camera on mobile
- Responsive design for small screens
- Touch-friendly buttons and controls
- Optimized image capture (1920x1080 max resolution)

## Future Enhancements

- [ ] Add image quality validation before upload
- [ ] Support for manual ISBN entry if detection fails
- [ ] Batch scanning for multiple books
- [ ] Offline support with local storage
- [ ] Image compression before upload
- [ ] Support for more book sections (table of contents, index)
