# Task 3.1: OAuth Provider Configuration Guide

## Overview

This guide walks you through configuring OAuth providers (Google, Apple, Microsoft) in your Supabase dashboard. This is a **manual configuration task** that must be completed in the Supabase dashboard.

**Time Required**: 30-45 minutes  
**Difficulty**: Intermediate  
**Prerequisites**: 
- Supabase project created (Task 2.1)
- Access to Google Cloud Console, Apple Developer, and Azure Portal

---

## Table of Contents

1. [Google OAuth Setup](#1-google-oauth-setup)
2. [Apple OAuth Setup](#2-apple-oauth-setup)
3. [Microsoft OAuth Setup](#3-microsoft-oauth-setup)
4. [Supabase Configuration](#4-supabase-configuration)
5. [Email Templates](#5-email-templates)
6. [Testing](#6-testing)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Google OAuth Setup

### Step 1.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `second-hand-book-marketplace`
4. Click **"Create"**

### Step 1.2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **"External"** user type
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: `Second-Hand Book Marketplace`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Add or Remove Scopes"**
   - Select: `userinfo.email`
   - Select: `userinfo.profile`
   - Select: `openid`
7. Click **"Save and Continue"**
8. **Test users** (optional for development): Add test emails
9. Click **"Save and Continue"**

### Step 1.3: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Supabase Auth`
5. **Authorized JavaScript origins**:
   ```
   https://your-project-ref.supabase.co
   http://localhost:3000
   ```
6. **Authorized redirect URIs**:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
   
   ⚠️ **Replace `your-project-ref`** with your actual Supabase project reference (found in Supabase Settings → API)

7. Click **"Create"**
8. **Copy and save**:
   - ✅ Client ID
   - ✅ Client Secret

---

## 2. Apple OAuth Setup

### Step 2.1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **"+"** button
4. Select **"App IDs"** → **"Continue"**
5. Select **"App"** → **"Continue"**
6. Fill in details:
   - **Description**: `Second-Hand Book Marketplace`
   - **Bundle ID**: `com.yourcompany.bookmarketplace` (use your domain)
7. Under **Capabilities**, enable **"Sign in with Apple"**
8. Click **"Continue"** → **"Register"**

### Step 2.2: Create Services ID

1. Click **Identifiers** → **"+"** button
2. Select **"Services IDs"** → **"Continue"**
3. Fill in details:
   - **Description**: `Book Marketplace Web Auth`
   - **Identifier**: `com.yourcompany.bookmarketplace.web`
4. Enable **"Sign in with Apple"**
5. Click **"Configure"** next to Sign in with Apple
6. **Primary App ID**: Select the App ID created in Step 2.1
7. **Domains and Subdomains**:
   ```
   your-project-ref.supabase.co
   localhost
   ```
8. **Return URLs**:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
9. Click **"Save"** → **"Continue"** → **"Register"**

### Step 2.3: Create Private Key

1. Navigate to **Keys** → **"+"** button
2. **Key Name**: `Supabase Auth Key`
3. Enable **"Sign in with Apple"**
4. Click **"Configure"** → Select your App ID
5. Click **"Save"** → **"Continue"** → **"Register"**
6. **Download the key file** (`.p8` file)
7. **Copy and save**:
   - ✅ Key ID (10-character string)
   - ✅ Team ID (found in top-right of Apple Developer portal)
   - ✅ Services ID (from Step 2.2)
   - ✅ Private Key file contents

---

## 3. Microsoft OAuth Setup

### Step 3.1: Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Fill in details:
   - **Name**: `Second-Hand Book Marketplace`
   - **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
5. **Redirect URI**:
   - Platform: **"Web"**
   - URI: `https://your-project-ref.supabase.co/auth/v1/callback`
6. Click **"Register"**

### Step 3.2: Configure Authentication

1. In your app, navigate to **Authentication**
2. Click **"Add a platform"** → **"Web"**
3. Add redirect URIs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
4. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens
5. Click **"Save"**

### Step 3.3: Create Client Secret

1. Navigate to **Certificates & secrets**
2. Click **"New client secret"**
3. **Description**: `Supabase Auth Secret`
4. **Expires**: Choose duration (recommended: 24 months)
5. Click **"Add"**
6. **Copy the secret value immediately** (you won't see it again!)

### Step 3.4: Configure API Permissions

1. Navigate to **API permissions**
2. Click **"Add a permission"** → **"Microsoft Graph"**
3. Select **"Delegated permissions"**
4. Add these permissions:
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
   - ✅ `User.Read`
5. Click **"Add permissions"**

### Step 3.5: Copy Credentials

From the **Overview** page, copy and save:
- ✅ Application (client) ID
- ✅ Directory (tenant) ID
- ✅ Client Secret (from Step 3.3)

---

## 4. Supabase Configuration

### Step 4.1: Access Supabase Auth Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers**

### Step 4.2: Configure Google Provider

1. Find **Google** in the provider list
2. Toggle **"Enable Sign in with Google"** to ON
3. Fill in credentials:
   - **Client ID**: Paste from Google Cloud Console (Step 1.3)
   - **Client Secret**: Paste from Google Cloud Console (Step 1.3)
4. **Authorized Client IDs** (optional): Leave empty for now
5. Click **"Save"**

### Step 4.3: Configure Apple Provider

1. Find **Apple** in the provider list
2. Toggle **"Enable Sign in with Apple"** to ON
3. Fill in credentials:
   - **Services ID**: From Apple Developer (Step 2.2)
   - **Team ID**: From Apple Developer (Step 2.3)
   - **Key ID**: From Apple Developer (Step 2.3)
   - **Private Key**: Paste contents of `.p8` file (Step 2.3)
4. Click **"Save"**

### Step 4.4: Configure Microsoft Provider

1. Find **Azure (Microsoft)** in the provider list
2. Toggle **"Enable Sign in with Azure"** to ON
3. Fill in credentials:
   - **Client ID**: Application (client) ID from Azure (Step 3.5)
   - **Client Secret**: From Azure (Step 3.5)
   - **Tenant ID**: Directory (tenant) ID from Azure (Step 3.5)
4. **Azure Tenant**: Select `common` (for personal + work accounts)
5. Click **"Save"**

### Step 4.5: Configure Redirect URLs

1. In Supabase, navigate to **Authentication** → **URL Configuration**
2. **Site URL**: 
   ```
   http://localhost:3000
   ```
   (Update to production URL when deploying)

3. **Redirect URLs** (add all):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/
   ```

4. Click **"Save"**

---

## 5. Email Templates

### Step 5.1: Configure Email Templates

1. Navigate to **Authentication** → **Email Templates**
2. Customize templates for:
   - **Confirm signup**
   - **Magic Link**
   - **Change Email Address**
   - **Reset Password**

### Step 5.2: Example Template Customization

**Confirm Signup Template**:
```html
<h2>Welcome to Second-Hand Book Marketplace!</h2>
<p>Thanks for signing up. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>If you didn't sign up, you can safely ignore this email.</p>
<p>Happy book hunting! 📚</p>
```

**Magic Link Template**:
```html
<h2>Sign in to Book Marketplace</h2>
<p>Click the link below to sign in to your account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
<p>This link expires in 1 hour.</p>
```

### Step 5.3: Configure Email Settings

1. Navigate to **Authentication** → **Settings**
2. **Enable Email Confirmations**: Toggle ON (recommended for production)
3. **Secure Email Change**: Toggle ON
4. **Email Rate Limit**: Set to reasonable value (e.g., 3 emails per hour)
5. Click **"Save"**

---

## 6. Testing

### Step 6.1: Test Google OAuth

1. Start your Next.js app: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click **"Sign in with Google"**
4. Verify redirect to Google consent screen
5. Grant permissions
6. Verify redirect back to your app
7. Check Supabase Dashboard → **Authentication** → **Users** for new user

### Step 6.2: Test Apple OAuth

1. Click **"Sign in with Apple"**
2. Verify redirect to Apple sign-in
3. Complete authentication
4. Verify redirect back to your app
5. Check user created in Supabase

### Step 6.3: Test Microsoft OAuth

1. Click **"Sign in with Microsoft"**
2. Verify redirect to Microsoft login
3. Complete authentication
4. Verify redirect back to your app
5. Check user created in Supabase

### Step 6.4: Verify User Data

In Supabase Dashboard → **Authentication** → **Users**, verify:
- ✅ User email is populated
- ✅ `provider` field shows correct provider (google/apple/azure)
- ✅ `user_metadata` contains profile information
- ✅ `created_at` timestamp is correct

---

## 7. Troubleshooting

### Common Issues

#### Google OAuth Errors

**Error: `redirect_uri_mismatch`**
- ✅ Verify redirect URI in Google Cloud Console matches Supabase callback URL exactly
- ✅ Check for trailing slashes
- ✅ Ensure protocol (http/https) matches

**Error: `invalid_client`**
- ✅ Verify Client ID and Secret are correct
- ✅ Check for extra spaces when copying credentials

#### Apple OAuth Errors

**Error: `invalid_client`**
- ✅ Verify Services ID is correct
- ✅ Check Team ID and Key ID
- ✅ Ensure private key is complete (including BEGIN/END lines)

**Error: `invalid_request`**
- ✅ Verify return URLs in Apple Developer match Supabase callback
- ✅ Check domain configuration

#### Microsoft OAuth Errors

**Error: `AADSTS50011: redirect_uri_mismatch`**
- ✅ Verify redirect URI in Azure matches Supabase callback URL
- ✅ Check Authentication → Redirect URIs in Azure portal

**Error: `AADSTS7000215: Invalid client secret`**
- ✅ Verify client secret is correct
- ✅ Check if secret has expired
- ✅ Generate new secret if needed

### General Debugging Steps

1. **Check Supabase Logs**:
   - Navigate to **Logs** → **Auth Logs**
   - Look for error messages

2. **Verify Environment Variables**:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Test with Supabase CLI**:
   ```bash
   npx supabase status
   ```

4. **Check Browser Console**:
   - Open DevTools → Console
   - Look for authentication errors

5. **Verify Callback URLs**:
   - Must match exactly in all three places:
     - OAuth provider console
     - Supabase Auth settings
     - Your application code

---

## Checklist

Use this checklist to track your progress:

### Google OAuth
- [ ] Created Google Cloud project
- [ ] Configured OAuth consent screen
- [ ] Created OAuth credentials
- [ ] Copied Client ID and Secret
- [ ] Configured in Supabase
- [ ] Tested sign-in flow

### Apple OAuth
- [ ] Created App ID
- [ ] Created Services ID
- [ ] Created private key
- [ ] Copied credentials (Key ID, Team ID, Services ID)
- [ ] Configured in Supabase
- [ ] Tested sign-in flow

### Microsoft OAuth
- [ ] Registered Azure application
- [ ] Configured authentication
- [ ] Created client secret
- [ ] Configured API permissions
- [ ] Copied credentials (Client ID, Tenant ID, Secret)
- [ ] Configured in Supabase
- [ ] Tested sign-in flow

### Supabase Configuration
- [ ] Enabled all three providers
- [ ] Configured redirect URLs
- [ ] Customized email templates
- [ ] Configured email settings
- [ ] Tested all OAuth flows
- [ ] Verified users created successfully

---

## Next Steps

After completing this task:

1. ✅ **Task 3.1 Complete**: OAuth providers configured
2. ➡️ **Task 3.2**: Write unit tests for auth configuration
3. ➡️ **Task 4**: Set up Supabase Storage for images

---

## Reference Links

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Apple OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Microsoft OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Apple Developer Portal](https://developer.apple.com/account/)
- [Azure Portal](https://portal.azure.com/)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase Auth logs
3. Consult provider-specific documentation
4. Check Supabase Discord community

**Estimated Completion Time**: 30-45 minutes  
**Status**: Ready to configure
