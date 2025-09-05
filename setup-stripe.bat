@echo off
echo Setting up Stripe products for Grubana...
echo.
echo Make sure you have set your STRIPE_SECRET_KEY environment variable
echo or edit setupStripeProducts.js to include your key directly.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

cd functions
node setupStripeProducts.js

echo.
echo Setup complete! Check the output above for your product IDs.
pause
