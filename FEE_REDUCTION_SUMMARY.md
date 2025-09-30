## GRUBANA PLATFORM FEE REDUCTION: 7% → 5%

### ✅ COMPLETED UPDATES:

#### 1. Mobile App Configuration (`grubana-mobile/`)
- **Payment Config**: Updated `src/utils/paymentConfig.js`
  - `commissionPercentage: 0.05` (was 0.07)
  - `description: '5% commission on food pre-orders'`

- **UI Text Updates**:
  - `TruckOnboardingScreen.js`: "95% of each order (5% commission)"
  - `OwnerSignupScreen.js`: "5% commission structure"
  - `RefundPolicyModal.js`: "5% processing fee"

#### 2. Web App Configuration (`web/`)
- **Server Payment Config**: Updated `src/server/paymentConfig.js`
  - Basic plan: `platformFeePercentage: 0.05` (was 0.07)
  - Features list: "5% platform fee per item"

- **UI Text Updates**:
  - `FAQ.jsx`: "5% fee" and "keep 95% of every sale"
  - `FAQ_backup.jsx`: Same updates
  - `TermsOfService.jsx`: "5% commission fee"
  - `TruckOnboarding.jsx`: "5% per order" and "5% platform fee per order"
  - `RefundPolicy.jsx`: "5% processing fee"

### 🔍 VERIFICATION POINTS:

#### Payment Processing Flow:
1. **Mobile Orders**: Use `calculateStripeConnectPayment()` from updated paymentConfig
2. **Web Orders**: Use `calculateOrderPlatformFees()` with basic plan (5%)
3. **Stripe Integration**: Server receives calculated `application_fee_amount` from client

#### Key Functions Using 5% Rate:
- `calculateGrubanaCommission()` - Mobile utility
- `calculateStripeConnectPayment()` - Mobile payment preparation
- `calculateOrderPlatformFees()` - Web server fee calculation
- `calculatePlatformFeeForItem()` - Web server per-item calculation

### 🚀 IMPACT:
- **Food Truck Owners**: Now keep 95% of pre-orders (up from 93%)
- **Platform Revenue**: Reduced by 2 percentage points per transaction
- **Stripe Fees**: Unchanged (still charged to connected accounts)
- **Customer Experience**: No change (still pay full menu price)

### 📋 DEPLOYMENT CHECKLIST:
- [x] Mobile app configuration updated
- [x] Web server configuration updated  
- [x] All user-facing text updated consistently
- [x] Payment calculation functions verified
- [ ] Deploy to production servers
- [ ] Update any external documentation
- [ ] Notify existing food truck partners of rate change

All fee calculations now use 5% commission rate across both mobile and web platforms!