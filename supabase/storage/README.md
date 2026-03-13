# Supabase Storage Configuration for Book Images

## Overview

This directory contains documentation and configuration for Supabase Storage setup for the Second-Hand Academic Book Marketplace. The storage system handles book images uploaded by sellers during the listing creation process.

## Storage Bucket: `book-images`

### Bucket Purpose
The `book-images` bucket stores all book-related images including:
- Front cover images
- Back cover images
- Spine images
- Page images (showing condition)
- Additional detail images

### Bucket Configuration

**Bucket Name**: `book-images`

**Settings**:
- **Public Access**: Enabled (read-only)
- **File Size Limit**: 5MB per file
- **Allowed MIME Types**: `image/jpeg`, `image/png`
- **File Path Structure**: `{user_id}/{listing_id}/{image_type}_{timestamp}.{ext}`

### Storage Policies

#### 1. Public Read Access
All authenticated and anonymous users can view images from active listings.

```sql
-- Policy: Anyone can view book images
CREATE POLICY "Public read access for book images"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-images');
```

#### 2. Authenticated Upload
Only authenticated users can upload images.

```sql
-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload book images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 3. Owner Update/Delete
Users can only update or delete their own images.

```sql
-- Policy: Users can update their own images
CREATE POLICY "Users can update own book images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own book images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## File Organization

### Directory Structure
```
book-images/
├── {user_id_1}/
│   ├── {listing_id_1}/
│   │   ├── front_cover_1704067200000.jpg
│   │   ├── back_cover_1704067201000.jpg
│   │   ├── spine_1704067202000.jpg
│   │   └── pages_1704067203000.jpg
│   └── {listing_id_2}/
│       └── ...
└── {user_id_2}/
    └── ...
```

### File Naming Convention
- **Format**: `{image_type}_{timestamp}.{extension}`
- **Image Types**: `front_cover`, `back_cover`, `spine`, `pages`, `detail`
- **Timestamp**: Unix timestamp in milliseconds
- **Extensions**: `jpg`, `jpeg`, `png`

**Examples**:
- `front_cover_1704067200000.jpg`
- `back_cover_1704067201000.png`
- `spine_1704067202000.jpg`
- `pages_1704067203000.jpg`

## Image Requirements

### File Constraints
- **Maximum Size**: 5MB per image
- **Minimum Dimensions**: 400x400 pixels
- **Maximum Dimensions**: 4000x4000 pixels
- **Supported Formats**: JPEG, PNG
- **Color Space**: RGB

### Image Processing
Images should be processed before or after upload:
1. **Validation**: Check file type, size, dimensions
2. **Compression**: Reduce file size while maintaining quality
3. **EXIF Stripping**: Remove metadata for privacy
4. **Thumbnail Generation**: Create multiple sizes (200x200, 600x600, 1200x1200)

## Setup Instructions

### Step 1: Create Storage Bucket

#### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `book-images`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: 5242880 (5MB in bytes)
   - **Allowed MIME types**: `image/jpeg,image/png`
5. Click **Create bucket**

#### Using Supabase CLI

```bash
# Create bucket
supabase storage create book-images --public

# Set file size limit (5MB)
supabase storage update book-images --file-size-limit 5242880

# Set allowed MIME types
supabase storage update book-images --allowed-mime-types "image/jpeg,image/png"
```

### Step 2: Apply Storage Policies

1. Go to **Storage** → **Policies** in Supabase dashboard
2. Select the `book-images` bucket
3. Click **New policy**
4. Apply each policy from the SQL section above

**Or use SQL Editor**:

1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the policy SQL from `storage_policies.sql`
3. Click **Run**

### Step 3: Verify Bucket Configuration

Run the verification script:

```bash
npm run verify:storage
```

Or manually check:

1. Go to **Storage** → **book-images** in dashboard
2. Verify bucket is public
3. Check policies are applied
4. Test upload with a sample image

## Usage Examples

### Upload Image (JavaScript/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadBookImage(
  userId: string,
  listingId: string,
  imageType: 'front_cover' | 'back_cover' | 'spine' | 'pages' | 'detail',
  file: File
): Promise<string> {
  // Generate file path
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filePath = `${userId}/${listingId}/${imageType}_${timestamp}.${extension}`;

  // Upload file
  const { data, error } = await supabase.storage
    .from('book-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('book-images')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

### Get Image URL

```typescript
// Get public URL for an image
function getImageUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('book-images')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

// Example usage
const imageUrl = getImageUrl('user-123/listing-456/front_cover_1704067200000.jpg');
```

### Delete Image

```typescript
async function deleteBookImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('book-images')
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
```

### List User Images

```typescript
async function listUserImages(userId: string): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('book-images')
    .list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' }
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return data.map(file => `${userId}/${file.name}`);
}
```

## Image Optimization

### Recommended Approach

1. **Client-Side Compression** (before upload):
   - Use libraries like `browser-image-compression`
   - Target: <500KB per image
   - Maintain aspect ratio

2. **Server-Side Processing** (after upload):
   - Generate thumbnails using Sharp or similar
   - Create multiple sizes: 200x200, 600x600, 1200x1200
   - Store in separate folders or with size suffix

3. **CDN Delivery**:
   - Supabase Storage includes CDN
   - Images are automatically cached
   - Use `Cache-Control` headers

### Example: Client-Side Compression

```typescript
import imageCompression from 'browser-image-compression';

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg'
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Compression failed:', error);
    return file;
  }
}
```

## Security Considerations

### 1. File Validation
Always validate files before upload:
- Check MIME type
- Verify file size
- Validate dimensions
- Scan for malware (server-side)

### 2. EXIF Data Stripping
Remove EXIF metadata to protect user privacy:
```typescript
import sharp from 'sharp';

async function stripExif(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .withMetadata({ exif: {} }) // Remove EXIF
    .toBuffer();
}
```

### 3. Rate Limiting
Implement upload rate limits:
- Max 10 images per minute per user
- Max 100 images per day per user
- Use Supabase Edge Functions or API routes

### 4. Content Validation
Verify uploaded files are actual images:
```typescript
import sharp from 'sharp';

async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format === 'jpeg' || metadata.format === 'png';
  } catch {
    return false;
  }
}
```

## Monitoring and Maintenance

### Storage Metrics
Monitor these metrics in Supabase dashboard:
- Total storage used
- Number of files
- Upload/download bandwidth
- Failed uploads

### Cleanup Strategy
Implement periodic cleanup:
1. Delete images from rejected listings (after 30 days)
2. Delete images from inactive listings (after 90 days)
3. Archive images from sold listings (after 1 year)

### Backup
Supabase automatically backs up storage, but consider:
- Periodic exports of critical images
- Separate backup of listing images
- Disaster recovery plan

## Troubleshooting

### Common Issues

#### 1. Upload Fails with "Policy violation"
**Cause**: User not authenticated or trying to upload to wrong folder
**Solution**: Ensure user is authenticated and uploading to their own folder

#### 2. Image Not Visible
**Cause**: Bucket not public or wrong URL
**Solution**: Check bucket is public and use `getPublicUrl()` method

#### 3. File Size Limit Exceeded
**Cause**: Image larger than 5MB
**Solution**: Compress image before upload

#### 4. CORS Error
**Cause**: CORS not configured for your domain
**Solution**: Add your domain to allowed origins in Supabase dashboard

### Debug Checklist
- [ ] Bucket exists and is public
- [ ] Storage policies are applied
- [ ] User is authenticated
- [ ] File size is under 5MB
- [ ] File type is JPEG or PNG
- [ ] File path follows naming convention
- [ ] CORS is configured for your domain

## Performance Optimization

### Best Practices
1. **Lazy Loading**: Load images only when visible
2. **Progressive Loading**: Show low-res placeholder first
3. **Caching**: Use browser cache and CDN
4. **Responsive Images**: Serve appropriate size for device
5. **WebP Format**: Consider WebP for better compression (if supported)

### Example: Responsive Image Component

```typescript
interface BookImageProps {
  path: string;
  alt: string;
  size?: 'thumbnail' | 'medium' | 'full';
}

function BookImage({ path, alt, size = 'medium' }: BookImageProps) {
  const supabase = createClient(/* ... */);
  
  const { data } = supabase.storage
    .from('book-images')
    .getPublicUrl(path);

  return (
    <img
      src={data.publicUrl}
      alt={alt}
      loading="lazy"
      style={{ width: '100%', height: 'auto' }}
    />
  );
}
```

## Cost Considerations

### Supabase Storage Pricing (as of 2024)
- **Free Tier**: 1GB storage, 2GB bandwidth
- **Pro Tier**: 100GB storage, 200GB bandwidth
- **Additional**: $0.021/GB storage, $0.09/GB bandwidth

### Cost Optimization
1. Compress images before upload
2. Delete unused images regularly
3. Use CDN caching effectively
4. Monitor bandwidth usage
5. Consider image optimization services

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)

## Support

For issues or questions:
1. Check Supabase Storage documentation
2. Review storage policies in dashboard
3. Test with verification script
4. Check Supabase status page for outages

## Version History

- **v1.0.0** (2024-01-01): Initial storage configuration for book images
