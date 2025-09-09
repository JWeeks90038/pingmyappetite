/**
 * Stripe Product Setup Script
 * This script creates the predefined products and prices in Stripe
 * to prevent creating new products on every payment attempt.
 * 
 * Run this script ONCE to set up your Stripe products properly.
 * 
 * Usage:
 * 1. Set your STRIPE_SECRET_KEY environment variable
 * 2. Run: node setupStripeProducts.js
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// You can also set your Stripe key directly here if needed:
// const STRIPE_SECRET_KEY = 'sk_test_...'; // Replace with your actual key

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY);

async function setupStripeProducts() {


  try {
    // Define your products with the same IDs referenced in your Firebase Function
    const products = [
      {
        key: 'event-premium',
        name: 'Grubana Event-premium Plan',
        description: 'Premium plan for professional event organizers',
        amount: 2900, // $29.00 in cents
        interval: 'month',
        predefinedProductId: 'prod_event_premium_grubana',
        predefinedPriceId: 'price_event_premium_monthly'
      },
      {
        key: 'pro',
        name: 'Grubana Pro Plan',
        description: 'Pro plan for food truck owners',
        amount: 999, // $9.99 in cents
        interval: 'month',
        predefinedProductId: 'prod_pro_grubana',
        predefinedPriceId: 'price_pro_monthly'
      },
      {
        key: 'all-access',
        name: 'Grubana All-access Plan',
        description: 'All-access plan with premium features',
        amount: 1999, // $19.99 in cents
        interval: 'month',
        predefinedProductId: 'prod_all_access_grubana',
        predefinedPriceId: 'price_all_access_monthly'
      }
    ];

    const createdProducts = {};

    for (const productDef of products) {


      // Try to use the predefined ID first, or check if product already exists
      let product;
      
      try {
        // First, try to retrieve the product using the predefined ID
        product = await stripe.products.retrieve(productDef.predefinedProductId);
   
      } catch (error) {
        // Product with predefined ID doesn't exist, check by name/metadata
        const existingProducts = await stripe.products.list({
          limit: 100
        });

        product = existingProducts.data.find(p => 
          p.name === productDef.name || 
          p.metadata?.key === productDef.key
        );

        if (product) {

        } else {
          // Create new product with the predefined ID
          try {
            product = await stripe.products.create({
              id: productDef.predefinedProductId, // Use predefined ID
              name: productDef.name,
              description: productDef.description,
              metadata: {
                key: productDef.key,
                grubana_plan: productDef.key
              }
            });
   
          } catch (createError) {
            // If predefined ID fails, create without ID
            product = await stripe.products.create({
              name: productDef.name,
              description: productDef.description,
              metadata: {
                key: productDef.key,
                grubana_plan: productDef.key
              }
            });
       
          }
        }
      }

      // Try to use the predefined price ID first, or check if price already exists
      let price;
      
      try {
        // First, try to retrieve the price using the predefined ID
        price = await stripe.prices.retrieve(productDef.predefinedPriceId);
   
      } catch (error) {
        // Price with predefined ID doesn't exist, check existing prices for this product
        const existingPrices = await stripe.prices.list({
          product: product.id,
          limit: 100
        });

        price = existingPrices.data.find(p => 
          p.unit_amount === productDef.amount && 
          p.recurring?.interval === productDef.interval
        );

        if (price) {
 
        } else {
          // Create new price with the predefined ID
          try {
            price = await stripe.prices.create({
              id: productDef.predefinedPriceId, // Use predefined ID
              unit_amount: productDef.amount,
              currency: 'usd',
              recurring: { interval: productDef.interval },
              product: product.id,
              metadata: {
                grubana_plan: productDef.key
              }
            });
     
          } catch (createError) {
            // If predefined ID fails, create without ID
            price = await stripe.prices.create({
              unit_amount: productDef.amount,
              currency: 'usd',
              recurring: { interval: productDef.interval },
              product: product.id,
              metadata: {
                grubana_plan: productDef.key
              }
            });
     
          }
        }
      }

      createdProducts[productDef.key] = {
        productId: product.id,
        priceId: price.id,
        name: productDef.name,
        amount: productDef.amount
      };
    }


    
    // Generate the code to update in the Firebase Function

    for (const [key, data] of Object.entries(createdProducts)) {
   
    }
 

  } catch (error) {

  }
}

// Run the setup
setupStripeProducts();
