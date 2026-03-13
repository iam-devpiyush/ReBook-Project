# Task 4: Storage Setup - Quick Reference

## ⚡ Quick Setup (10 minutes)

### 1. Create Bucket (5 min)
```
Dashboard → Storage → New bucket
Name: book-images
Public: ✅ Yes
Size limit: 5242880
MIME types: image/jpeg,image/png
```

### 2. Apply Policies (3 min)
```
Dashboard → SQL Editor → New query
Copy: supabase/storage/storage_policies.sql
Paste → Run
```

### 3. Verify (2 min)
```bash
npm run verify:storage
```

## 📋 Verification Checklist

- [ ] Bucket `book-images` exists
- [ ] Bucket is public
- [ ] File size limit: 5MB
- [ ] MIME types: JPEG, PNG
- [ ] 4 policies applied
- [ ] Verification passes

## 🔧 Configuration

**Bucket**: `book-images`  
**Public**: Yes (read-only)  
**Size**: 5MB max  
**Types**: JPEG, PNG  
**CDN**: Enabled  

## 📁 File Structure

```
book-images/
└── {user_id}/
    └── {listing_id}/
        ├── front_cover_{timestamp}.jpg
        ├── back_cover_{timestamp}.jpg
        ├── spine_{timestamp}.jpg
        └── pages_{timestamp}.jpg
```

## 🔐 Policies

1. **Public Read** - Anyone can view
2. **Auth Upload** - Logged-in users upload
3. **Owner Update** - Update own images
4. **Owner Delete** - Delete own images

## 💻 Usage Example

```typescript
// Upload
const { data } = await supabase.storage
  .from('book-images')
  .upload(filePath, file);

// Get URL
const { data: { publicUrl } } = supabase.storage
  .from('book-images')
  .getPublicUrl(filePath);

// Delete
await supabase.storage
  .from('book-images')
  .remove([filePath]);
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bucket exists | Skip to policies |
| Policy exists | Verify in dashboard |
| Upload denied | Check auth & folder |
| Image not loading | Verify bucket public |
| CORS error | Add domain to origins |

## 📚 Documentation

- Full guide: `supabase/storage/SETUP_GUIDE.md`
- Detailed docs: `supabase/storage/README.md`
- SQL policies: `supabase/storage/storage_policies.sql`
- Verification: `scripts/verify-storage-setup.ts`

## ✅ Next Steps

1. Complete setup above
2. Run verification
3. Mark Task 4 complete
4. Proceed to Task 5 (Meilisearch)

---

**Time**: 10 minutes  
**Difficulty**: Easy  
**Requirements**: 2.4, 21.1-21.7
