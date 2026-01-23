#!/bin/bash
echo "🧹 Cleaning React Native Cache..."

# 1. Clear Watchman (if installed)
if command -v watchman &> /dev/null; then
    watchman watch-del-all
else
    echo "Active watchman not found, skipping."
fi

# 2. Clear Metro Cache
echo "Deleting temporary cache files..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

# 3. Clear Node Modules Cache (nuclear)
echo "Cleaning node_modules cache..."
rm -rf node_modules/.cache

# 4. Instructions
echo "✅ Cleanup Complete."
echo "PLEASE RUN THIS COMMAND NOW:"
echo "npm start -- --reset-cache"
