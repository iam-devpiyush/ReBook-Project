# Supabase Storage Setup Guide

## Quick Start

This guide walks you through setting up Supabase Storage for the book-images bucket.

**Estimated Time**: 10 minutes

## Prerequisites

- ✅ Supabase project created
- ✅ Database migrations applied (Task 2.4 completed)
- ✅ Environment variables configured

## Step-by-Step Setup

### Step 1: Create Storage Bucket (5 minutes)

#### Option A: Using Supabase Dashboard (Recommended)

1. **Navigate to Storage**
   - Go to https://app.supabase.com
   - Select your project
   - Click **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **New bucket** button
   - Fill in the form:
     ```
     Name: book-images
     Public bucket: ✅ Enabled
     File size limit: 5242880 (5MB in bytes)
     Allowed MIME types: image/jpeg,image/png
     ```
   - Click **Create bucket**

3. **Verify Bucket Created**
   - You should see `book-images` in the bucket list
   - The bucket should have a "Public" badge

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Create bucket
supabase storage create book-images --public

# Set file size limit (5MB = 5242880 bytes)
supabase storage update book-images --file-size-limit 5242880

# Set allowed MIME types
supabase storage update book-images --allowed-mime-types "image/jpeg,image/png"
```

### Step 2: Apply Storage Policies (3 minutes)

#### Option A: Using SQL Editor (Recommended)

1. **Open SQL Editor**
   - In Supabase dashboard, click **SQL Editor**
   - Click **New query**

2. **Copy Policy SQL**
   - Open `supabase/storage/storage_policies.sql`
   - Copy all the SQL content

3. **Execute Policies**
   - Paste the SQL into the editor
   - Click **Run** or press `Ctrl+Enter`
   - You should see "Success. No rows returned"

4. **Verify Policies Applied**
   - Go to **Storage** → **Policies**
   - Select `book-images` bucket
   - You should see 4 policies:
     - ✅ Public read access for book images
     - ✅ Authenticated users can upload book images
     - ✅ Users can update own book images
     - ✅ Users can delete own book images

#### Option B: Using Supabase CLI

```bash
# Apply policies from SQL file
supabase db execute -f supabase/storage/storage_policies.sql
```

### Step 3: Test Storage Setup (2 minutes)

#### Manual Test via Dashboard

1. **Test Upload**
   - Go to **Storage** → **book-images**
   - Click **Upload file**
   - Select a test image (JPEG or PNG, <5MB)
   - Create a folder structure: `test-user/test-listing/`
   - Upload as `front_cover_test.jpg`

2. **Test Public Access**
   - Click on the uploaded file
   - Click **Get URL**
   - Copy the public URL
   - Open in a new browser tab (incognito mode)
   - Image should load without authentication

3. **Clean Up**
   - Delete the test file and folders

#### Automated Test via Script

```bash
# Run verification script
npm run verify:storage
```

Expected output:
```
✓ Supabase client initialized
✓ Storage bucket 'book-images' exists
✓ Bucket is public
✓ File size limit is 5MB
✓ Allowed MIME types: image/jpeg, image/png
✓ Storage policies applied (4 policies)
✓ Test upload successful
✓ Test public access successful
✓ Test delete successful

All storage checks passed! ✓
```

## Configuration Summary

After completing setup, you should have:

### Bucket Configuration
- **Name**: `book-images`
- **Visibility**: Public (read-only)
- **File Size Limit**: 5MB (5,242,880 bytes)
- **Allowed Types**: JPEG, PNG
- **CDN**: Enabled (automatic)

### Storage Policies
1. **Public Read**: Anyone can view images
2. **Authenticated Upload**: Only logged-in users can upload
3. **Owner Update**: Users can update their own images
4. **Owner Delete**: Users can delete their own images

### File Organization
```
book-images/
└── {user_id}/
    └── {listing_id}/
        ├── front_cover_{timestamp}.jpg
        ├── back_cover_{timestamp}.jpg
        ├── spine_{timestamp}.jpg
        └── pages_{timestamp}.jpg
```

## Troubleshooting

### Issue: "Bucket already exists"
**Solution**: The bucket was already created. Skip to Step 2.

### Issue: "Policy already exists"
**Solution**: Policies were already applied. Verify they're correct in Storage → Policies.

### Issue: "Permission denied" when uploading
**Causes**:
1. User not authenticated
2. Trying to upload to wrong folder (not matching user ID)
3. File size exceeds 5MB
4. File type not JPEG or PNG

**Solution**: Check authentication, file path, file size, and file type.

### Issue: "Image not loading" in browser
**Causes**:
1. Bucket not public
2. Wrong URL format
3. File doesn't exist

**Solution**: 
- Verify bucket is public in dashboard
- Use `getPublicUrl()` method to get correct URL
- Check file exists in storage

### Issue: CORS error in browser
**Solution**: Add your domain to allowed origins:
1. Go to **Settings** → **API**
2. Add your domain to **CORS allowed origins**
3. Include `http://localhost:3000` for development

## Next Steps

After completing storage setup:

1. ✅ **Update Environment Variables** (if needed)
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. ✅ **Implement Image Upload Utilities**
   - See `supabase/storage/README.md` for code examples
   - Create upload helper functions
   - Add image validation

3. ✅ **Test Integration**
   - Test upload from frontend
   - Verify images display correctly
   - Test delete functionality

4. ✅ **Proceed to Next Task**
   - Task 5: Set up Meilisearch for search

## Verification Checklist

Before moving to the next task, verify:

- [ ] Bucket `book-images` exists and is public
- [ ] File size limit is 5MB
- [ ] Allowed MIME types are image/jpeg and image/png
- [ ] 4 storage policies are applied
- [ ] Test upload works
- [ ] Test public access works (without authentication)
- [ ] Test delete works
- [ ] Verification script passes all checks

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Policies Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Image Optimization Guide](https://supabase.com/docs/guides/storage/serving/image-transformations)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase Storage documentation
3. Check Supabase status page: https://status.supabase.com
4. Review storage policies in dashboard
5. Check browser console for errors

## Notes

- Storage is automatically backed up by Supabase
- CDN is enabled by default for public buckets
- Images are cached for 1 hour by default
- Consider implementing image compression before upload
- Monitor storage usage in dashboard to avoid exceeding limits

---

**Task 4 Status**: Ready for setup ✓

Once you complete this setup, mark Task 4 as complete and proceed to Task 5 (Meilisearch setup).
