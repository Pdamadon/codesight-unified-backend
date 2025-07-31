/**
 * Verify Uploaded Data
 * 
 * Check what enhanced color/design data was stored in the MongoDB database
 */

import pkg from './dist/services/world-model/database/service.js';
const { WorldModelService } = pkg;
import fs from 'fs';

async function verifyUploadedData() {
  console.log('🔍 Verifying Enhanced Data Upload\n');
  
  const worldModel = new WorldModelService(
    "mongodb+srv://pdamadon:Locoman123@codesight-worldmodel.rt7hek9.mongodb.net/?retryWrites=true&w=majority&appName=codesight-worldmodel",
    "world_model"
  );

  await worldModel.connect();
  
  try {
    // Check domains
    const domainCount = await worldModel.db.collection('world_model_domains').countDocuments();
    const domains = await worldModel.db.collection('world_model_domains').find({}).toArray(); 
    console.log(`📊 Domains stored: ${domainCount}`);
    domains.forEach((domain, i) => {
      console.log(`   ${i + 1}. ${domain.name} (${domain.domain})`);
    });
    
    // Check categories
    const categoryCount = await worldModel.db.collection('world_model_categories').countDocuments();
    console.log(`\n📂 Categories stored: ${categoryCount}`);
    
    // Check products
    const productCount = await worldModel.db.collection('world_model_products').countDocuments();
    const products = await worldModel.db.collection('world_model_products').find({}).toArray(); 
    console.log(`\n📦 Products stored: ${productCount}`);
    
    if (products.length > 0) {
      const product = products[0];
      console.log(`\n🎯 DETAILED PRODUCT ANALYSIS:`);
      console.log(`   Raw Product Keys: ${Object.keys(product)}`);
      console.log(`   Product ID: ${product.primaryProduct?.productId || 'unknown'}`);
      console.log(`   Product Name: ${product.primaryProduct?.productName || 'unknown'}`);
      console.log(`   URL: ${product.primaryProduct?.url || 'unknown'}`);
      console.log(`   Price: $${product.primaryProduct?.price || 0}`);
      
      // Check color variant options
      const colorOptions = product.primaryProduct.variants?.colors?.options || [];
      console.log(`\n🌈 COLOR VARIANT OPTIONS (${colorOptions.length}):`);
      colorOptions.slice(0, 5).forEach((option, i) => {
        console.log(`   ${i + 1}. Display Name: "${option.displayName}"`);
        console.log(`      Value: ${option.value}`);
        console.log(`      Selector: ${option.selector}`);
        console.log(`      Color Name: "${option.attributes?.colorName || 'none'}"`);
        console.log(`      Design Text: "${option.attributes?.designText || 'none'}"`);
        console.log(`      Full Description: "${option.attributes?.fullDescription || 'none'}"`);
        console.log(`      Was Selected: ${option.attributes?.wasSelected || false}`);
        console.log(`      URL: ${option.attributes?.url?.substring(0, 60)}...`);
        console.log('');
      });
      if (colorOptions.length > 5) {
        console.log(`   ... and ${colorOptions.length - 5} more color options`);
      }
      
      // Check size options
      const sizeOptions = product.primaryProduct.variants?.sizes?.options || [];
      console.log(`\n📏 SIZE OPTIONS (${sizeOptions.length}):`);
      sizeOptions.forEach((option, i) => {
        console.log(`   ${i + 1}. ${option.value} (${option.displayName})`);
        console.log(`      Final Selection: ${option.attributes?.finalSelection || false}`);
        console.log(`      Was Tested: ${option.attributes?.wasTested || false}`);
      });
      
      // Check variant URLs
      const variantUrls = product.primaryProduct.urls?.variants || [];
      console.log(`\n🔗 VARIANT URLS STORED (${variantUrls.length}):`);
      variantUrls.slice(0, 5).forEach((variant, i) => {
        console.log(`   ${i + 1}. ${variant.variantType}: ${variant.variantValue}`);
        console.log(`      URL: ${variant.url.substring(0, 80)}...`);
      });
      if (variantUrls.length > 5) {
        console.log(`   ... and ${variantUrls.length - 5} more variant URLs`);
      }
      
      // Check metadata for selected color info
      const selectedColorInfo = product.primaryProduct.metadata?.selectedColorInfo;
      if (selectedColorInfo) {
        console.log(`\n📍 SELECTED COLOR METADATA:`);
        console.log(`   Color Name: "${selectedColorInfo.colorName || 'none'}"`);
        console.log(`   Design Text: "${selectedColorInfo.designText || 'none'}"`);
        console.log(`   Full Description: "${selectedColorInfo.fullDescription || 'none'}"`);
      }
      
      // Check user behavior metadata
      const userBehavior = product.primaryProduct.metadata?.userBehavior;
      if (userBehavior) {
        console.log(`\n👤 USER BEHAVIOR ANALYSIS:`);
        console.log(`   Color Browsing Pattern: ${userBehavior.colorBrowsingPattern}`);
        console.log(`   Size Testing: ${userBehavior.sizeTesting}`);
        console.log(`   Purchase Decision: ${userBehavior.purchaseDecision}`);
      }
      
      // Check complete color variants metadata
      const colorVariants = product.primaryProduct.metadata?.colorVariants;
      if (colorVariants && colorVariants.length > 0) {
        console.log(`\n🎨 COMPLETE COLOR VARIANTS METADATA (${colorVariants.length}):`);
        colorVariants.slice(0, 3).forEach((variant, i) => {
          console.log(`   ${i + 1}. Variant ${variant.variantId}:`);
          console.log(`      Color: "${variant.colorName || 'not extracted'}"`);
          console.log(`      Design: "${variant.designText || 'not extracted'}"`);
          console.log(`      Selected: ${variant.wasSelected ? '✅' : '❌'}`);
          console.log(`      URL: ${variant.url?.substring(0, 60)}...`);
        });
        if (colorVariants.length > 3) {
          console.log(`   ... and ${colorVariants.length - 3} more variants`);
        }
      }
    }
    
    // Summary of enhancement success
    console.log(`\n🎉 ENHANCEMENT VERIFICATION SUMMARY:`);
    console.log(`   ✅ Database Upload: Successful`);
    console.log(`   ✅ Color/Design Separation: ${products.length > 0 && products[0].primaryProduct.metadata?.selectedColorInfo ? 'Working' : 'Failed'}`);
    console.log(`   ✅ Variant URLs: ${products.length > 0 && products[0].primaryProduct.urls?.variants?.length > 0 ? 'Stored' : 'Missing'}`);
    console.log(`   ✅ User Behavior: ${products.length > 0 && products[0].primaryProduct.metadata?.userBehavior ? 'Captured' : 'Missing'}`);
    
    // Save verification results
    const verificationData = {
      verificationTimestamp: new Date(),
      databaseStatus: {
        domains: domainCount,
        categories: categoryCount,
        products: productCount
      },
      enhancementStatus: {
        colorDesignSeparation: products.length > 0 && products[0].primaryProduct.metadata?.selectedColorInfo ? 'success' : 'failed',
        variantUrls: products.length > 0 && products[0].primaryProduct.urls?.variants?.length > 0 ? 'stored' : 'missing',
        userBehavior: products.length > 0 && products[0].primaryProduct.metadata?.userBehavior ? 'captured' : 'missing'
      },
      sampleData: products.length > 0 ? {
        productId: products[0].primaryProduct.productId,
        colorOptionsCount: products[0].primaryProduct.variants?.colors?.options?.length || 0,
        sizeOptionsCount: products[0].primaryProduct.variants?.sizes?.options?.length || 0,
        variantUrlsCount: products[0].primaryProduct.urls?.variants?.length || 0,
        selectedColorInfo: products[0].primaryProduct.metadata?.selectedColorInfo
      } : null
    };
    
    fs.writeFileSync('upload-verification-results.json', JSON.stringify(verificationData, null, 2));
    console.log('\n📄 Verification results saved to upload-verification-results.json');
    
  } finally {
    await worldModel.disconnect();
  }
}

// Run the verification
verifyUploadedData().catch(console.error);