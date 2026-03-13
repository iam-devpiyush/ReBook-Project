# Task 3.1: OAuth Setup - Quick Checklist

## 📋 Quick Reference

### Google OAuth (15 min)
- [ ] Create Google Cloud project
- [ ] Configure OAuth consent screen (add scopes: email, profile, openid)
- [ ] Create OAuth client ID (Web application)
- [ ] Add redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- [ ] Copy Client ID and Secret
- [ ] Enable in Supabase → Authentication → Providers → Google
- [ ] Test sign-in

### Apple OAuth (15 min)
- [ ] Create App ID with "Sign in with Apple" capability
- [ ] Create Services ID
- [ ] Configure domains and return URLs
- [ ] Create private key (.p8 file)
- [ ] Copy: Services ID, Team ID, Key ID, Private Key
- [ ] Enable in Supabase → Authentication → Providers → Apple
- [ ] Test sign-in

### Microsoft OAuth (10 min)
- [ ] Register app in Azure Portal
- [ ] Add redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- [ ] Create client secret
- [ ] Add API permissions (openid, profile, email, User.Read)
- [ ] Copy: Client ID, Tenant ID, Client Secret
- [ ] Enable in Supabase → Authentication → Providers → Azure
- [ ] Test sign-in

### Supabase Configuration (5 min)
- [ ] Configure Site URL in Authentication → URL Configuration
- [ ] Add all redirect URLs (localhost + production)
- [ ] Customize email templates (optional)
- [ ] Enable email confirmations (recommended for production)

## 🔑 Credentials to Collect

### Google
```
Client ID: _______________________________________________
Client Secret: ___________________________________________
```

### Apple
```
Services ID: _____________________________________________
Team ID: _________________________________________________
Key ID: __________________________________________________
Private Key: (save .p8 file)
```

### Microsoft
```
Client ID: _______________________________________________
Tenant ID: _______________________________________________
Client Secret: ___________________________________________
```

## ✅ Testing Checklist

- [ ] Google sign-in works on localhost
- [ ] Apple sign-in works on localhost
- [ ] Microsoft sign-in works on localhost
- [ ] User appears in Supabase → Authentication → Users
- [ ] User metadata populated correctly
- [ ] No console errors

## 🚨 Common Mistakes

❌ Redirect URI mismatch (check for trailing slashes)  
❌ Forgot to enable provider in Supabase  
❌ Copied credentials with extra spaces  
❌ Apple private key incomplete (missing BEGIN/END lines)  
❌ Microsoft secret expired  

## 📚 Full Guide

See `TASK_3.1_OAUTH_SETUP.md` for detailed step-by-step instructions.

---

**Total Time**: ~40 minutes  
**Difficulty**: Intermediate
