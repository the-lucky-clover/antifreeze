# Xcode Project Scaffold for Neon Summarizer Safari Extension

## Quick Setup

```bash
# 1. Build the extension
npm run build

# 2. Generate Xcode project
xcrun safari-web-extension-packager dist \
  --project-location ./safari/NeonSummarizerXcode \
  --app-name "Neon Summarizer" \
  --bundle-identifier "com.example.neonsummarizer" \
  --swift \
  --macos-only

# 3. Alternatively, run the full build script
./safari/packaging/build-safari.sh
```

## Project Structure After Scaffold

```
safari/
├── NeonSummarizerXcode/          # Xcode project location (auto-generated)
│   ├── NeonSummarizer.xcodeproj/
│   ├── NeonSummarizer/           # Main app with extension
│   │   ├── Info.plist
│   │   └── ViewController.swift
│   └── NeonSummarizer Extension/ # Safari extension target
│       ├── SafariWebExtensionHandler.swift
│       ├── Info.plist
│       └── Resources/
│           └── popup.html        # Copied from dist
```

## Manual Xcode Configuration

After running `safari-web-extension-packager`, open in Xcode:

1. **Bundle Identifier**: `com.example.neonsummarizer`
2. **Version**: `1.0.0`
3. **Build**: `1`
4. **Team**: Your Apple Developer Team
5. **Deployment Target**: macOS 11.0 or later
6. **App Category**: `public.app-category.productivity`

## App Store Archive Settings

In Xcode:
- Product → Archive
- Window → Organizer → Distribute App → App Store Connect
- Export Options: Use `safari/packaging/ExportOptions.plist`

## iOS Variant

iOS Safari extensions use the same codebase:
- Extension files in `safari/ios/`
- Requires App Store submission through iOS app
- No background script support on iOS