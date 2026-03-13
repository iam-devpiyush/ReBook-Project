# Task 3.1: OAuth Provider Setup - Complete Guide

## 📚 Documentation Index

This task involves configuring OAuth providers (Google, Apple, Microsoft) in your Supabase dashboard. All documentation has been created to guide you through the process.

---

## 🚀 Quick Start

**New to OAuth setup?** Start here:

1. **Read**: [`TASK_3.1_SUMMARY.md`](./TASK_3.1_SUMMARY.md) - Overview and what to expect
2. **Follow**: [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md) - Step-by-step instructions
3. **Track**: [`TASK_3.1_QUICK_CHECKLIST.md`](./TASK_3.1_QUICK_CHECKLIST.md) - Progress checklist
4. **Store**: Copy `oauth-credentials.template.md` to `oauth-credentials.md` and fill in

**Time Required**: 30-45 minutes  
**Difficulty**: Intermediate

---

## 📖 Documentation Files

### Main Guides

| File | Purpose | When to Use |
|------|---------|-------------|
| **TASK_3.1_SUMMARY.md** | Task overview and requirements | Read first to understand the task |
| **TASK_3.1_OAUTH_SETUP.md** | Complete step-by-step guide | Follow while configuring providers |
| **TASK_3.1_QUICK_CHECKLIST.md** | Condensed checklist | Quick reference during setup |
| **TASK_3.1_OAUTH_FLOW_DIAGRAM.md** | Visual diagrams and flows | Understand OAuth architecture |

### Templates

| File | Purpose | When to Use |
|------|---------|-------------|
| **oauth-credentials.template.md** | Credential storage template | Copy and fill in with your credentials |

### Security

| File | Purpose | Status |
|------|---------|--------|
| **.gitignore** | Excludes credential files | ✅ Updated to protect secrets |

---

## 🎯 What You'll Configure

### 1. Google OAuth (15 min)
- Create Google Cloud project
- Configure OAuth consent screen
- Generate Client ID and Secret
- Configure in Supabase

### 2. Apple OAuth (15 min)
- Create App ID and Services ID
- Generate private key (.p8)
- Configure domains and return URLs
- Configure in Supabase

### 3. Microsoft OAuth (10 min)
- Register Azure application
- Create client secret
- Configure API permissions
- Configure in Supabase

### 4. Supabase Configuration (5 min)
- Enable all three providers
- Configure redirect URLs
- Customize email templates (optional)

---

## ✅ Prerequisites

Before starting, ensure you have:

- [ ] Supabase project created (Task 2.1 complete)
- [ ] Google Cloud Console account (free)
- [ ] Apple Developer account ($99/year - required for Apple OAuth)
- [ ] Microsoft Azure account (free)
- [ ] 30-45 minutes of uninterrupted time

---

## 📋 Step-by-Step Process

### Step 1: Preparation (5 min)

1. Open all required consoles in separate tabs:
   - [Google Cloud Console](https://console.cloud.google.com/)
   - [Apple Developer Portal](https://developer.apple.com/account/)
   - [Azure Portal](https://portal.azure.com/)
   - [Supabase Dashboard](https://app.supabase.com/)

2. Copy credential template:
   ```bash
   cp oauth-credentials.template.md oauth-credentials.md
   ```

3. Open checklist:
   - Open `TASK_3.1_QUICK_CHECKLIST.md` in a separate window

### Step 2: Configure Google OAuth (15 min)

Follow Section 1 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

**Key Steps**:
1. Create Google Cloud project
2. Configure OAuth consent screen
3. Create OAuth credentials
4. Copy Client ID and Secret
5. Configure in Supabase
6. Test sign-in

### Step 3: Configure Apple OAuth (15 min)

Follow Section 2 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

**Key Steps**:
1. Create App ID
2. Create Services ID
3. Generate private key
4. Copy credentials
5. Configure in Supabase
6. Test sign-in

### Step 4: Configure Microsoft OAuth (10 min)

Follow Section 3 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

**Key Steps**:
1. Register application
2. Create client secret
3. Configure API permissions
4. Copy credentials
5. Configure in Supabase
6. Test sign-in

### Step 5: Supabase Configuration (5 min)

Follow Section 4 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

**Key Steps**:
1. Enable all three providers
2. Configure redirect URLs
3. Customize email templates (optional)
4. Test all OAuth flows

### Step 6: Testing (5 min)

Follow Section 6 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

**Test Each Provider**:
1. Start dev server: `npm run dev`
2. Test Google sign-in
3. Test Apple sign-in
4. Test Microsoft sign-in
5. Verify users in Supabase dashboard

---

## 🔐 Security Best Practices

### DO ✅

- ✅ Store credentials in `oauth-credentials.md` (already in .gitignore)
- ✅ Use different OAuth apps for dev and production
- ✅ Set calendar reminders for credential expiration
- ✅ Use password manager for credential backup
- ✅ Review OAuth scopes annually

### DON'T ❌

- ❌ Commit credentials to git
- ❌ Share credentials in plain text
- ❌ Use production credentials in development
- ❌ Ignore credential expiration warnings
- ❌ Grant unnecessary OAuth scopes

---

## 🐛 Troubleshooting

### Quick Fixes

| Error | Solution |
|-------|----------|
| `redirect_uri_mismatch` | Verify redirect URIs match exactly in provider console and Supabase |
| `invalid_client` | Double-check Client ID and Secret (no extra spaces) |
| `access_denied` | User must grant permission on consent screen |
| Apple OAuth fails | Verify private key includes BEGIN/END lines |
| Microsoft secret expired | Generate new secret in Azure Portal |

### Detailed Troubleshooting

See Section 7 in [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md) for comprehensive troubleshooting.

---

## 📊 Progress Tracking

Use the checklist in [`TASK_3.1_QUICK_CHECKLIST.md`](./TASK_3.1_QUICK_CHECKLIST.md) to track:

- [ ] Google OAuth configured and tested
- [ ] Apple OAuth configured and tested
- [ ] Microsoft OAuth configured and tested
- [ ] All credentials stored securely
- [ ] All tests passing

---

## ✨ Success Criteria

After completing this task, you should be able to:

✅ Sign in with Google from your application  
✅ Sign in with Apple from your application  
✅ Sign in with Microsoft from your application  
✅ See new users in Supabase → Authentication → Users  
✅ User metadata populated correctly  
✅ No errors in browser console or Supabase logs

---

## 🎓 Learning Resources

### Understanding OAuth

- **Visual Guide**: [`TASK_3.1_OAUTH_FLOW_DIAGRAM.md`](./TASK_3.1_OAUTH_FLOW_DIAGRAM.md)
- **Supabase Docs**: [Auth Documentation](https://supabase.com/docs/guides/auth)
- **OAuth 2.0 Spec**: [RFC 6749](https://tools.ietf.org/html/rfc6749)

### Provider-Specific Guides

- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Microsoft OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-azure)

---

## 🆘 Getting Help

If you encounter issues:

1. **Check troubleshooting section** in main guide
2. **Review Supabase logs**: Dashboard → Logs → Auth Logs
3. **Verify credentials** are correct (no typos or extra spaces)
4. **Check redirect URIs** match exactly
5. **Consult Supabase Discord** community

---

## 📝 Requirements Addressed

This task addresses the following requirements from the spec:

- **Requirement 1.1**: OAuth flow initiation with provider redirect
- **Requirement 1.2**: Authorization code exchange for tokens

---

## ➡️ Next Steps

After completing Task 3.1:

1. ✅ Mark Task 3.1 as complete in `tasks.md`
2. ➡️ Proceed to **Task 3.2**: Write unit tests for auth configuration
3. ➡️ Then **Task 4**: Set up Supabase Storage for images

---

## 📞 Support

### Documentation
- Main guide: `TASK_3.1_OAUTH_SETUP.md`
- Quick checklist: `TASK_3.1_QUICK_CHECKLIST.md`
- Visual diagrams: `TASK_3.1_OAUTH_FLOW_DIAGRAM.md`
- Summary: `TASK_3.1_SUMMARY.md`

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- Provider documentation (Google, Apple, Microsoft)

---

## 📌 Quick Reference

### Important URLs

**Supabase Callback URL** (use in all providers):
```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

**Development Redirect URL**:
```
http://localhost:3000/auth/callback
```

**Production Redirect URL** (when deploying):
```
https://your-production-domain.com/auth/callback
```

### Credentials Needed

| Provider | Credentials Required |
|----------|---------------------|
| Google | Client ID, Client Secret |
| Apple | Services ID, Team ID, Key ID, Private Key (.p8) |
| Microsoft | Client ID, Tenant ID, Client Secret |

---

## 🎉 Summary

Task 3.1 is a **manual configuration task** that sets up OAuth authentication for your marketplace. Follow the guides in order, track your progress with the checklist, and store credentials securely.

**Total Time**: 30-45 minutes  
**Difficulty**: Intermediate  
**Documentation**: ✅ Complete and ready to use

**Start here**: [`TASK_3.1_OAUTH_SETUP.md`](./TASK_3.1_OAUTH_SETUP.md)

---

**Good luck with your OAuth setup! 🚀**
