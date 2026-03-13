# OAuth Credentials Template

⚠️ **SECURITY WARNING**: This file contains sensitive credentials. 
- DO NOT commit this file to version control
- Add to `.gitignore` immediately
- Store securely (password manager recommended)

---

## Project Information

**Supabase Project Reference**: `_____________________`  
**Supabase Project URL**: `https://_____________________.supabase.co`  
**Site URL (Development)**: `http://localhost:3000`  
**Site URL (Production)**: `https://_____________________`

---

## Google OAuth Credentials

**Created**: ___/___/______  
**Google Cloud Project**: `_____________________`

```
Client ID: 
_____________________________________________________________

Client Secret: 
_____________________________________________________________
```

**Authorized JavaScript Origins**:
- `https://YOUR-PROJECT.supabase.co`
- `http://localhost:3000`

**Authorized Redirect URIs**:
- `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`

**Status**: [ ] Configured in Supabase  [ ] Tested

---

## Apple OAuth Credentials

**Created**: ___/___/______  
**Apple Developer Account**: `_____________________`

```
Services ID (Identifier): 
_____________________________________________________________

Team ID: 
_____________________________________________________________

Key ID: 
_____________________________________________________________

Private Key (.p8 file location): 
_____________________________________________________________

Private Key Contents:
-----BEGIN PRIVATE KEY-----
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
-----END PRIVATE KEY-----
```

**Domains and Subdomains**:
- `YOUR-PROJECT.supabase.co`
- `localhost`

**Return URLs**:
- `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`

**Status**: [ ] Configured in Supabase  [ ] Tested

---

## Microsoft OAuth Credentials

**Created**: ___/___/______  
**Azure Application Name**: `_____________________`

```
Application (Client) ID: 
_____________________________________________________________

Directory (Tenant) ID: 
_____________________________________________________________

Client Secret: 
_____________________________________________________________

Client Secret Expires: ___/___/______
```

**Redirect URIs**:
- `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- `http://localhost:3000/auth/callback`

**API Permissions**:
- [x] openid
- [x] profile
- [x] email
- [x] User.Read

**Status**: [ ] Configured in Supabase  [ ] Tested

---

## Supabase Configuration

### URL Configuration

**Site URL**: `http://localhost:3000`

**Redirect URLs** (comma-separated):
```
http://localhost:3000/auth/callback,
http://localhost:3000/,
https://YOUR-PRODUCTION-DOMAIN/auth/callback,
https://YOUR-PRODUCTION-DOMAIN/
```

### Email Settings

- [ ] Email confirmations enabled
- [ ] Secure email change enabled
- [ ] Email templates customized
- [ ] Email rate limit configured

---

## Testing Log

### Google OAuth Test
- **Date**: ___/___/______
- **Result**: [ ] Success  [ ] Failed
- **Notes**: _________________________________________________

### Apple OAuth Test
- **Date**: ___/___/______
- **Result**: [ ] Success  [ ] Failed
- **Notes**: _________________________________________________

### Microsoft OAuth Test
- **Date**: ___/___/______
- **Result**: [ ] Success  [ ] Failed
- **Notes**: _________________________________________________

---

## Troubleshooting Notes

**Issues Encountered**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Solutions Applied**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Maintenance Schedule

**Next Review Date**: ___/___/______

**Credential Expiration Dates**:
- Google: No expiration
- Apple: Key created ___/___/______ (no expiration)
- Microsoft: Secret expires ___/___/______

**Renewal Reminders**:
- [ ] Set calendar reminder for Microsoft secret renewal (30 days before expiration)
- [ ] Review OAuth scopes annually
- [ ] Update redirect URIs when deploying to production

---

## Security Checklist

- [ ] All credentials stored securely
- [ ] File added to `.gitignore`
- [ ] No credentials committed to git
- [ ] Team members have secure access to credentials
- [ ] Backup copy stored in password manager
- [ ] Production credentials separate from development

---

**Last Updated**: ___/___/______  
**Updated By**: _____________________
