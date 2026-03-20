#!/usr/bin/env bash
# apply-updates.sh
# Run from the directory containing both repo folders:
#   drive-assistant/
#   da-admin/
#   da-updates/   ← this update package

set -e
UPDATES="$(dirname "$0")/da-updates"

echo "=== D.A Update Applier ==="

# ── Shared files → both repos ──────────────────────────────────
for REPO in drive-assistant da-admin; do
  if [ ! -d "$REPO" ]; then echo "⚠️  $REPO not found, skipping"; continue; fi

  echo "→ Copying shared files to $REPO..."
  cp "$UPDATES/shared/theme.js"        "$REPO/src/theme.js"
  cp "$UPDATES/shared/ThemeToggle.jsx" "$REPO/src/components/ThemeToggle.jsx"

  # Prepend global.css to index.css if not already present
  if ! grep -q "IBM Plex Mono" "$REPO/src/index.css" 2>/dev/null; then
    cat "$UPDATES/shared/global.css" "$REPO/src/index.css" > /tmp/index_merged.css
    mv /tmp/index_merged.css "$REPO/src/index.css"
    echo "  ✓ Merged global.css into $REPO/src/index.css"
  else
    echo "  ⏭  global.css already merged in $REPO"
  fi
done

# ── da-admin specific ──────────────────────────────────────────
if [ -d "da-admin" ]; then
  echo "→ Applying da-admin components..."
  cp "$UPDATES/da-admin/src/components/ShadowMesh.jsx"      "da-admin/src/components/ShadowMesh.jsx"
  cp "$UPDATES/da-admin/src/components/FleetManagement.jsx" "da-admin/src/components/FleetManagement.jsx"
  cp "$UPDATES/da-admin/src/components/AdminManagement.jsx" "da-admin/src/components/AdminManagement.jsx"
  cp "$UPDATES/da-admin/src/components/AdminInbox.jsx"      "da-admin/src/components/AdminInbox.jsx"
  cp "$UPDATES/da-admin/src/App.jsx"                        "da-admin/src/App.jsx"
  echo "  ✓ da-admin components updated"
fi

# ── da-app specific ────────────────────────────────────────────
if [ -d "drive-assistant" ]; then
  echo "→ Applying da-app components..."
  cp "$UPDATES/da-app/src/components/Profile.jsx"    "drive-assistant/src/components/Profile.jsx"
  cp "$UPDATES/da-app/src/components/UserInbox.jsx"  "drive-assistant/src/components/UserInbox.jsx"
  cp "$UPDATES/da-app/src/App.jsx"                   "drive-assistant/src/App.jsx"

  # Append mobile CSS
  if ! grep -q "mobile-nav" "drive-assistant/src/index.css" 2>/dev/null; then
    cat "$UPDATES/da-app/mobile.css" >> "drive-assistant/src/index.css"
    echo "  ✓ Mobile CSS appended"
  fi
  echo "  ✓ da-app components updated"
fi

echo ""
echo "=== Files updated. Next steps: ==="
echo "1. Apply SQL:  supabase SQL editor → paste da-updates/sql/004_fleets_notifications_admins.sql"
echo "2. da-admin:   cd da-admin && git add -A && git commit -m 'feat: fleets, admin mgmt, shadow mesh v2, themes, realtime inbox' && git push"
echo "3. da-app:     cd drive-assistant && git add -A && git commit -m 'feat: fleet join, user inbox realtime, profile improvements, light/dark theme' && git push"
echo ""
echo "Netlify will auto-deploy on push. ✓"
