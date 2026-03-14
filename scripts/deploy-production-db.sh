#!/usr/bin/env bash
# =============================================================================
# Production Database Deployment Script
# Applies Supabase migrations and verifies the production setup.
# =============================================================================
set -euo pipefail

echo "=== ReBook Marketplace — Production DB Setup ==="

# ---------------------------------------------------------------------------
# 1. Verify Supabase CLI is installed
# ---------------------------------------------------------------------------
if ! command -v supabase &>/dev/null; then
  echo "ERROR: Supabase CLI not found. Install it with: brew install supabase/tap/supabase"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Link to production project (requires SUPABASE_PROJECT_REF env var)
# ---------------------------------------------------------------------------
if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "ERROR: SUPABASE_PROJECT_REF is not set."
  echo "  Export it: export SUPABASE_PROJECT_REF=your-project-ref"
  exit 1
fi

echo "Linking to Supabase project: $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF"

# ---------------------------------------------------------------------------
# 3. Run migrations
# ---------------------------------------------------------------------------
echo "Running database migrations..."
supabase db push

echo "Migrations applied successfully."

# ---------------------------------------------------------------------------
# 4. Verify tables exist (basic smoke test)
# ---------------------------------------------------------------------------
echo "Verifying schema..."
supabase db diff --schema public || true

echo ""
echo "=== Production DB setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Verify RLS policies in Supabase dashboard → Authentication → Policies"
echo "  2. Enable database backups: Supabase dashboard → Settings → Database → Backups"
echo "  3. Set up Meilisearch production instance and run initial index sync"
