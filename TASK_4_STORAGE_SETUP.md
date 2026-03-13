# Task 4: Supabase Storage Setup - Complete Guide

## Task Overview

**Task**: Set up Supabase Storage for images  
**Status**: ⏳ Ready for User Action  
**Estimated Time**: 10 minutes

### Requirements Addressed
- **Requirement 2.4**: Image upload to cloud storage
- **Requirements 21.1-21.7**: Image storage and optimization
  - 21.1: Image compression
  - 21.2: Multiple image sizes (thumbnail, medium, full)
  - 21.3: CDN delivery via Supabase Storage
  - 21.4: Placeholder images on load failure
  - 21.5: Lazy loading for galleries
  - 21.6: EXIF data stripping for privacy
  - 21.7: Signed URLs for secure access

## What Was Prepared

### 1. Documentation Created ✅

#### `supabase/storage/README.md`
Comprehensive documentation covering:
- Bucket configuration and purpose
- Storage policies (read, upload, update, delete)
- File organization and naming conventions
- Image requirements and constraints
- Setup instructions (dashboard and CLI)
- Usage examples (upload, get URL, delete, list)
- Image optimization strategies
- Security considerations
- Monitoring and maintenance
- Troubleshooting guide
- Performance optimization
- Cost considerations

#### `supabase/storage/SETUP_GUIDE.md`
Step-by-step setup guide with:
- Quick start instructions
- Prerequisites checklist
- Detailed setup steps (bucket creation, policies, testing)
- Configuration summary
- Troubleshooting section
- Verification checklist
- Next steps

#### `supabase/storage/storage_policies.sql`
SQL file containing all storage policies:
- Public read access policy
- Authenticated upload policy
- Owner update policy
- Owner delete policy
- Verification queries
- Detailed comments and notes

### 2. Verification Script Created ✅

#### `scripts/verify-storage-setup.ts`
Automated verification script that checks:
- Environment variables configured
- Supabase client initialization
- Bucket exists
- Bucket is public
- File size limit (5MB)
- Allowed MIME types (JPEG, PNG)
- Provides clear pass/fail results

### 3. Package Scripts Updated ✅

Added to `package.json`:
```json
{
  "scripts": {
    "verify:storage": "ts-node scripts/verify-storage-setup.ts"
  }
}
```

## Storage Configuration Details

### Bucket: `book-images`

**Purpose**: Store all book-related images uploaded by sellers

**Settings**:
- **Name**: `book-images`
- **Public**: Yes (read-only)
- **File Size Limit**: 5MB (5,242,880 bytes)
- **Allowed MIME Types**: `image/jpeg`, `image/png`
- **CDN**: Enabled (automatic)

### File Organization

```
book-images/
└── {user_id}/
    └── {listing_id}/
        ├── front_cover_{timestamp}.jpg
        ├── back_cover_{timestamp}.jpg
        ├── spine_{timestamp}.jpg
        ├── pages_{timestamp}.jpg
        └── detail_{timestamp}.jpg
```

**File Naming Convention**:
- Format: `{image_type}_{timestamp}.{extension}`
- Image types: `front_cover`, `back_cover`, `spine`, `pages`, `detail`
- Timestamp: Unix timestamp in milliseconds
- Extensions: `jpg`, `jpeg`, `png`

### Storage Policies

1. **Public Read Access**
   - Anyone can view images (required for marketplace)
   - Enables CDN caching
   - No authentication required

2. **Authenticated Upload**
   - Only logged-in users can upload
   - Users can only upload to their own folder
   - Folder name must match user ID

3. **Owner Update**
   - Users can update their own images
   - Allows replacing images if needed

4. **Owner Delete**
   - Users can delete their own images
   - Allows removing images from listings

## User Action Required

### Step 1: Create Storage Bucket (5 minutes)

#### Using Supabase Dashboard (Recommended)

1. Go to https://app.supabase.com
2. Select your project
3. Click **Storage** in left sidebar
4. Click **New bucket**
5. Configure:
   - Name: `book-images`
   - Public bucket: ✅ Enabled
   - File size limit: `5242880`
   - Allowed MIME types: `image/jpeg,image/png`
6. Click **Create bucket**

#### Using Supabase CLI (Alternative)

```bash
# Create bucket
supabase storage create book-images --public

# Set file size limit
supabase storage update book-images --file-size-limit 5242880

# Set allowed MIME types
supabase storage update book-images --allowed-mime-types "image/jpeg,image/png"
```

### Step 2: Apply Storage Policies (3 minutes)

#### Using SQL Editor (Recommended)

1. In Supabase dashboard, click **SQL Editor**
2. Click **New query**
3. Open `supabase/storage/storage_policies.sql`
4. Copy all SQL content
5. Paste into SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify success message

#### Using Supabase CLI (Alternative)

```bash
supabase db execute -f supabase/storage/storage_policies.sql
```

### Step 3: Verify Setup (2 minutes)

#### Automated Verification

```bash
npm run verify:storage
```

Expected output:
```
✓ Environment variables configured
✓ Supabase client initialized
✓ Bucket 'book-images' exists
✓ Bucket is public
✓ File size limit is 5MB
✓ Allowed MIME types: image/jpeg, image/png

✅ All checks passed! (6/6)
```

#### Manual Verification

1. Go to **Storage** → **book-images** in dashboard
2. Verify bucket shows "Public" badge
3. Go to **Storage** → **Policies**
4. Select `book-images` bucket
5. Verify 4 policies are listed:
   - Public read access for book images
   - Authenticated users can upload book images
   - Users can update own book images
   - Users can delete own book images

## Usage Examples

### Upload Image (TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function uploadBookImage(
  userId: string,
  listingId: string,
  imageType: 'front_cover' | 'back_cover' | 'spine' | 'pages',
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filePath = `${userId}/${listingId}/${imageType}_${timestamp}.${extension}`;

  const { data, error } = await supabase.storage
    .from('book-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('book-images')
    .getPublicUrl(filePath);

  return publicUrl;
}
```

### Get Image URL

```typescript
function getImageUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('book-images')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}
```

### Delete Image

```typescript
async function deleteBookImage(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('book-images')
    .remove([filePath]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}
```

## Security Features

### 1. File Validation
- MIME type restricted to JPEG and PNG
- File size limited to 5MB
- Enforced at bucket level

### 2. Access Control
- Public read access (required for marketplace)
- Upload restricted to authenticated users
- Users can only upload to their own folders
- Update/delete restricted to file owners

### 3. Privacy Protection
- EXIF data should be stripped before/after upload
- User IDs used in paths (not personal info)
- Signed URLs available for additional security

### 4. Rate Limiting
- Implement in application layer:
  - Max 10 uploads per minute per user
  - Max 100 uploads per day per user

## Image Optimization

### Recommended Approach

1. **Client-Side Compression** (before upload)
   - Use `browser-image-compression` library
   - Target: <500KB per image
   - Maintain aspect ratio

2. **Server-Side Processing** (after upload)
   - Generate thumbnails: 200x200, 600x600, 1200x1200
   - Strip EXIF data
   - Optimize compression

3. **CDN Delivery**
   - Automatic via Supabase Storage
   - Images cached for 1 hour
   - Use `Cache-Control` headers

## Troubleshooting

### Issue: "Bucket already exists"
**Solution**: Bucket was already created. Skip to Step 2 (policies).

### Issue: "Policy already exists"
**Solution**: Policies already applied. Verify in Storage → Policies.

### Issue: "Permission denied" on upload
**Causes**:
- User not authenticated
- Uploading to wrong folder (not matching user ID)
- File size exceeds 5MB
- File type not JPEG/PNG

### Issue: Image not loading
**Causes**:
- Bucket not public
- Wrong URL format
- File doesn't exist

**Solution**: Use `getPublicUrl()` method, verify bucket is public.

### Issue: CORS error
**Solution**: Add domain to allowed origins in Settings → API.

## Verification Checklist

Before marking task complete:

- [ ] Bucket `book-images` created
- [ ] Bucket is public
- [ ] File size limit is 5MB
- [ ] Allowed MIME types: image/jpeg, image/png
- [ ] 4 storage policies applied
- [ ] Verification script passes all checks
- [ ] Can access bucket from Supabase dashboard
- [ ] Policies visible in Storage → Policies

## Next Steps

After completing this task:

1. ✅ Mark Task 4 as complete
2. ✅ Proceed to Task 5: Set up Meilisearch for search
3. ✅ Implement image upload utilities (Task 12)
4. ✅ Test image upload in listing creation flow

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
- [Supabase Storage API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload)

## Support

For issues:
1. Check troubleshooting section above
2. Review `supabase/storage/README.md`
3. Check Supabase status: https://status.supabase.com
4. Review storage policies in dashboard

---

**Task 4 Status**: ⏳ Ready for User Action

**Estimated Completion Time**: 10 minutes

Once you complete the setup steps and verification passes, Task 4 is complete! ✓
