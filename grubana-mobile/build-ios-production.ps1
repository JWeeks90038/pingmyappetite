# Production iOS Build Script for Grubana Mobile (PowerShell)

Write-Host "🚀 Starting production iOS build for Grubana..." -ForegroundColor Green

# Ensure we're in the correct directory
Set-Location $PSScriptRoot

# Set production environment
$env:NODE_ENV = "production"

# Install/update dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Clear any previous builds and cache
Write-Host "🧹 Clearing cache..." -ForegroundColor Yellow
npx expo r -c
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Verify EAS CLI is installed and up to date
Write-Host "🔧 Checking EAS CLI..." -ForegroundColor Yellow
npx eas-cli@latest --version

# Login to EAS (if not already logged in)
Write-Host "🔐 Verifying EAS authentication..." -ForegroundColor Yellow
npx eas whoami

# Build for production (App Store)
Write-Host "🏗️ Building production iOS .ipa for App Store..." -ForegroundColor Green
npx eas build --platform ios --profile production --clear-cache

Write-Host "✅ Production build initiated!" -ForegroundColor Green
Write-Host "📱 Monitor build progress at: https://expo.dev/accounts/[your-account]/projects/grubana-mobile/builds" -ForegroundColor Cyan
Write-Host "⬇️ Download your .ipa when complete and upload to App Store Connect" -ForegroundColor Cyan
