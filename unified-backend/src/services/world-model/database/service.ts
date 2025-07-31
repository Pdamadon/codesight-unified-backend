/**
 * World Model Database Service
 * 
 * Manages the hierarchical world model: Domain → Category → Product
 * Handles sibling discovery, variant cluster mapping, and deduplication
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
  WorldModelDomain,
  WorldModelCategory,
  WorldModelProduct,
  ProductDiscoveryContext,
  CategoryDiscoveryContext,
  SiblingProduct,
  SiblingCategory,
  VariantCluster,
  Collections,
  WorldModelIndexes,
  SiblingContext,
  PageType,
  CategoryType,
  CategoryDiscoveryType,
  ProductAvailability
} from './schema';

export class WorldModelService {
  private client: MongoClient;
  private db: Db;
  private domains: Collection<WorldModelDomain>;
  private categories: Collection<WorldModelCategory>;
  private products: Collection<WorldModelProduct>;

  constructor(connectionString: string, dbName: string = 'world_model') {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
    this.domains = this.db.collection(Collections.DOMAINS);
    this.categories = this.db.collection(Collections.CATEGORIES);
    this.products = this.db.collection(Collections.PRODUCTS);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.createIndexes();
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  private async createIndexes(): Promise<void> {
    // Create indexes for efficient querying
    try {
      // Domain indexes
      await this.domains.createIndex({ domain: 1 });
      await this.domains.createIndex({ siteType: 1 });
      await this.domains.createIndex({ 'reliability.overallSuccessRate': -1 });
      await this.domains.createIndex({ updatedAt: -1 });

      // Category indexes  
      await this.categories.createIndex({ domainId: 1, categoryPath: 1 });
      await this.categories.createIndex({ domainId: 1, parentCategoryPath: 1 });
      await this.categories.createIndex({ domainId: 1, categoryType: 1 });
      await this.categories.createIndex({ 'reliability.successRate': -1 });
      await this.categories.createIndex({ updatedAt: -1 });

      // Product indexes
      await this.products.createIndex({ domain: 1, productId: 1 });
      await this.products.createIndex({ domain: 1, productName: 1 });
      await this.products.createIndex({ 'discoveryContexts.categoryPath': 1 });
      await this.products.createIndex({ 'currentState.lastPriceUpdate': -1 });
      await this.products.createIndex({ 'reliability.lastSeen': -1 });
      await this.products.createIndex({ productType: 1 });
      await this.products.createIndex({ updatedAt: -1 });
    } catch (error) {
      console.warn('Some indexes may already exist:', error);
    }
  }

  // ===========================
  // DOMAIN MANAGEMENT
  // ===========================

  async upsertDomain(domainData: Partial<WorldModelDomain>): Promise<string> {
    const domain = domainData.domain!;
    
    const existingDomain = await this.domains.findOne({ domain });
    
    if (existingDomain) {
      await this.domains.updateOne(
        { domain },
        {
          $set: {
            ...domainData,
            updatedAt: new Date()
          }
        }
      );
      return existingDomain._id!.toString();
    }

    const newDomain: WorldModelDomain = {
      ...domainData as WorldModelDomain,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    const result = await this.domains.insertOne(newDomain);
    return result.insertedId.toString();
  }

  async getDomain(domain: string): Promise<WorldModelDomain | null> {
    return await this.domains.findOne({ domain });
  }

  // ===========================
  // CATEGORY MANAGEMENT
  // ===========================

  async upsertCategory(categoryData: Partial<WorldModelCategory>): Promise<string> {
    const { domainId, categoryPath, categoryName } = categoryData;
    
    // Try to find existing category by path or name for deduplication
    const existingCategory = await this.findExistingCategory(
      domainId!, 
      categoryPath!, 
      categoryName!
    );

    if (existingCategory) {
      // Separate discoveryContexts from other category data to avoid conflicts
      const { discoveryContexts, ...otherCategoryData } = categoryData;
      
      const updateData: any = {
        $set: {
          ...otherCategoryData,
          updatedAt: new Date()
        }
      };

      // Add discovery contexts if provided (without overwriting existing ones)
      if (discoveryContexts && discoveryContexts.length > 0) {
        updateData.$push = {
          discoveryContexts: { $each: discoveryContexts as CategoryDiscoveryContext[] }
        };
      }

      await this.categories.updateOne(
        { _id: existingCategory._id },
        updateData
      );
      return existingCategory._id!.toString();
    }

    // Create new category
    const newCategory: WorldModelCategory = {
      ...categoryData as WorldModelCategory,
      discoveryContexts: categoryData.discoveryContexts || [],
      siblingCategories: categoryData.siblingCategories || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    const result = await this.categories.insertOne(newCategory);
    return result.insertedId.toString();
  }

  async getCategory(domainId: string, categoryPath: string): Promise<WorldModelCategory | null> {
    return await this.categories.findOne({ domainId, categoryPath });
  }

  async getCategoriesForDomain(domainId: string): Promise<WorldModelCategory[]> {
    return await this.categories.find({ domainId }).toArray();
  }

  /**
   * Find existing category for deduplication
   * Matches by categoryPath first, then by similar categoryName
   */
  private async findExistingCategory(
    domainId: string,
    categoryPath: string,
    categoryName: string
  ): Promise<WorldModelCategory | null> {
    
    // Try exact path match first (most reliable)
    const byPath = await this.categories.findOne({ domainId, categoryPath });
    if (byPath) return byPath;

    // Try name-based matching for deduplication
    // Handle cases where same category has different paths
    const nameVariations = this.generateCategoryNameVariations(categoryName);
    
    for (const variation of nameVariations) {
      const byName = await this.categories.findOne({
        domainId,
        categoryName: { $regex: new RegExp(variation, 'i') }
      });
      if (byName) return byName;
    }

    return null;
  }

  /**
   * Generate category name variations for fuzzy matching
   */
  private generateCategoryNameVariations(categoryName: string): string[] {
    const variations = [categoryName];
    
    // Remove common suffixes/prefixes
    const cleanName = categoryName
      .replace(/^(men's|women's|kids?'?s?)\s+/i, '')
      .replace(/\s+(sale|clearance|new)$/i, '');
    
    if (cleanName !== categoryName) {
      variations.push(cleanName);
    }

    // Add plural/singular variations
    if (categoryName.endsWith('s')) {
      variations.push(categoryName.slice(0, -1)); // Remove 's'
    } else {
      variations.push(categoryName + 's'); // Add 's'
    }

    return variations;
  }

  /**
   * Ingest category with sibling discovery
   */
  async ingestCategoryWithSiblings(data: {
    domainId: string;
    primaryCategory: any;
    siblingCategories: any[];
    discoveryContext: {
      discoveredFrom?: string;
      spatialContext: any;
      menuStructure?: any;
    };
  }): Promise<void> {
    
    const { domainId, primaryCategory, siblingCategories, discoveryContext } = data;

    // Process primary category
    await this.upsertCategory({
      domainId,
      ...primaryCategory,
      discoveryContexts: [{
        discoveredFrom: discoveryContext.discoveredFrom || 'direct',
        discoveryType: CategoryDiscoveryType.PRIMARY,
        discoveredAt: new Date(),
        contextData: {
          section: 'main-nav',
          interactionType: 'click'
        },
        spatialContext: {
          nearbyCategories: this.processSiblingCategoryData(siblingCategories),
          menuStructure: discoveryContext.menuStructure?.type || 'horizontal'
        }
      }],
      siblingCategories: this.processSiblingCategoryData(siblingCategories)
    });

    // Process each sibling category
    for (const siblingCategory of siblingCategories) {
      await this.upsertCategory({
        domainId,
        ...siblingCategory,
        discoveryContexts: [{
          discoveredFrom: primaryCategory.categoryPath,
          discoveryType: CategoryDiscoveryType.SIBLING,
          spatialPosition: siblingCategory.spatialPosition,
          discoveredAt: new Date(),
          contextData: {
            section: 'main-nav',
            interactionType: 'visible'
          },
          spatialContext: {
            nearbyCategories: [],
            menuStructure: discoveryContext.menuStructure?.type || 'horizontal'
          }
        }]
      });
    }
  }

  /**
   * Process sibling category data from spatial context
   */
  private processSiblingCategoryData(siblingCategories: any[]): SiblingCategory[] {
    return siblingCategories.map(sibling => ({
      categoryPath: sibling.categoryPath || this.inferCategoryPath(sibling.categoryName),
      categoryName: sibling.categoryName || sibling.name,
      selector: sibling.selector,
      relativePosition: sibling.relativePosition || 'unknown',
      distance: sibling.distance || 0,
      discoveredAt: new Date(),
      menuLevel: sibling.menuLevel || 0,
      isActive: sibling.isActive || false
    }));
  }

  /**
   * Infer category path from category name
   */
  private inferCategoryPath(categoryName: string): string {
    return categoryName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^(men|women|kids?)-/, '$1/');
  }

  // ===========================
  // PRODUCT MANAGEMENT WITH SIBLING DISCOVERY
  // ===========================

  /**
   * Main method for ingesting product data with sibling discovery
   * Handles deduplication and context-aware storage
   */
  async ingestProductWithSiblings(data: {
    domain: string;
    categoryPath: string;
    primaryProduct: any; // Data from the clicked/interacted product
    siblingProducts: any[]; // All other products discovered on the same page
    pageContext: {
      pageType: PageType;
      url: string;
      totalProductsOnPage: number;
    };
    spatialContext: any; // From training data
    siblingsContext: any; // From training data
  }): Promise<void> {
    
    // Process the primary product first
    await this.upsertProduct({
      domain: data.domain,
      productData: data.primaryProduct,
      discoveryContext: {
        categoryPath: data.categoryPath,
        pageType: data.pageContext.pageType,
        siblingContext: this.determineSiblingContext(data.siblingProducts),
        positionOnPage: data.primaryProduct.position || 1,
        totalProductsOnPage: data.pageContext.totalProductsOnPage,
        discoveredAt: new Date(),
        discoveredSiblings: this.processSiblingData(data.siblingProducts),
        contextSpecificData: {
          originalPrice: data.primaryProduct.originalPrice,
          discountPercent: data.primaryProduct.discountPercent,
          searchQuery: data.primaryProduct.searchQuery,
          filterApplied: data.primaryProduct.filterApplied
        },
        spatialContext: {
          nearbyElements: data.spatialContext?.nearbyElements || [],
        }
      }
    });

    // Process all sibling products
    for (const siblingProduct of data.siblingProducts) {
      await this.upsertProduct({
        domain: data.domain,
        productData: siblingProduct,
        discoveryContext: {
          categoryPath: data.categoryPath,
          pageType: data.pageContext.pageType,
          siblingContext: this.determineSiblingContext(data.siblingProducts),
          positionOnPage: siblingProduct.position,
          totalProductsOnPage: data.pageContext.totalProductsOnPage,
          discoveredAt: new Date(),
          discoveredSiblings: [], // Siblings don't need to store other siblings
          contextSpecificData: {
            originalPrice: siblingProduct.originalPrice,
            discountPercent: siblingProduct.discountPercent,
            searchQuery: siblingProduct.searchQuery,
            filterApplied: siblingProduct.filterApplied
          },
          spatialContext: {
            nearbyElements: [],
          }
        }
      });
    }
  }

  /**
   * Upsert a single product with discovery context
   * Handles deduplication by product name/ID and adds new contexts
   */
  async upsertProduct(data: {
    domain: string;
    productData: any;
    discoveryContext: ProductDiscoveryContext;
  }): Promise<string> {
    
    const { domain, productData, discoveryContext } = data;
    
    // Try to find existing product by ID or name
    const existingProduct = await this.findExistingProduct(
      domain, 
      productData.productId, 
      productData.productName
    );

    if (existingProduct) {
      // Update existing product with new discovery context
      await this.products.updateOne(
        { _id: existingProduct._id },
        {
          $push: {
            discoveryContexts: discoveryContext
          },
          $set: {
            'currentState.price': productData.price,
            'currentState.availability': productData.availability || ProductAvailability.AVAILABLE,
            'currentState.lastPriceUpdate': new Date(),
            'reliability.lastSeen': new Date(),
            updatedAt: new Date()
          }
        }
      );
      return existingProduct._id!.toString();
    }

    // Create new product
    const newProduct: WorldModelProduct = {
      domain,
      productId: productData.productId,
      productName: productData.productName,
      sku: productData.sku,
      productType: productData.productType || 'unknown',
      
      discoveryContexts: [discoveryContext as ProductDiscoveryContext],
      
      currentState: {
        price: productData.price || 0,
        currency: productData.currency || 'USD',
        availability: productData.availability || ProductAvailability.AVAILABLE,
        lastPriceUpdate: new Date(),
        inStock: productData.inStock !== false
      },

      urls: {
        canonical: productData.url || '',
        variants: []
      },

      images: {
        primary: productData.image || '',
        gallery: productData.images || [],
        variants: {}
      },

      variants: {
        colors: this.extractVariantCluster(productData.variants?.colors, 'color'),
        sizes: this.extractVariantCluster(productData.variants?.sizes, 'size'),
        styles: this.extractVariantCluster(productData.variants?.styles, 'style')
      },

      pageSelectors: productData.selectors || {},
      workflows: productData.workflows || {},
      relationships: {
        similarProducts: [],
        crossSellProducts: [],
        categoryMates: []
      },

      reliability: {
        selectorSuccessRates: {},
        totalInteractions: 0,
        lastVerified: new Date(),
        lastSeen: new Date()
      },

      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    const result = await this.products.insertOne(newProduct);
    return result.insertedId.toString();
  }

  /**
   * Find existing product by ID or name for deduplication
   */
  private async findExistingProduct(
    domain: string, 
    productId?: string, 
    productName?: string
  ): Promise<WorldModelProduct | null> {
    
    // Try by product ID first (most reliable)
    if (productId) {
      const byId = await this.products.findOne({ domain, productId });
      if (byId) return byId;
    }

    // Try by product name (fallback for deduplication)
    if (productName) {
      const byName = await this.products.findOne({ 
        domain, 
        productName: { $regex: new RegExp(productName, 'i') }
      });
      if (byName) return byName;
    }

    return null;
  }

  /**
   * Process sibling product data from spatial/siblings context
   */
  private processSiblingData(siblingProducts: any[]): SiblingProduct[] {
    return siblingProducts.map(sibling => ({
      productId: sibling.productId || sibling.id,
      productName: sibling.name || sibling.title,
      selector: sibling.selector,
      relativePosition: sibling.relativePosition || 'unknown',
      distance: sibling.distance || 0,
      discoveredAt: new Date()
    }));
  }

  /**
   * Determine if siblings are homogeneous (same product type) or mixed
   */
  private determineSiblingContext(siblingProducts: any[]): SiblingContext {
    if (siblingProducts.length === 0) return SiblingContext.UNKNOWN;
    
    const productTypes = new Set(
      siblingProducts.map(p => p.productType || 'unknown')
    );
    
    return productTypes.size === 1 ? SiblingContext.HOMOGENEOUS : SiblingContext.MIXED;
  }

  /**
   * Extract variant cluster information from product data
   */
  private extractVariantCluster(variantData: any, type: string): VariantCluster {
    if (!variantData) {
      return {
        type: type as any,
        containerSelector: '',
        selectorPattern: '',
        options: [],
        layout: {
          arrangement: 'horizontal_row' as any,
          spatialPattern: ''
        },
        discoveryInfo: {
          discoveredFromSiblings: false,
          totalOptionsFound: 0,
          discoveredAt: new Date(),
          reliability: 0
        }
      };
    }

    return {
      type: type as any,
      containerSelector: variantData.containerSelector || '',
      selectorPattern: variantData.selectorPattern || '',
      options: variantData.options || [],
      layout: variantData.layout || {
        arrangement: 'horizontal_row' as any,
        spatialPattern: ''
      },
      discoveryInfo: {
        discoveredFromSiblings: variantData.discoveredFromSiblings || false,
        totalOptionsFound: variantData.options?.length || 0,
        discoveredAt: new Date(),
        reliability: variantData.reliability || 0
      }
    };
  }

  // ===========================
  // QUERY METHODS FOR RAG
  // ===========================

  /**
   * Get products for a specific category context
   */
  async getProductsForCategory(
    domain: string, 
    categoryPath: string
  ): Promise<WorldModelProduct[]> {
    return await this.products.find({
      domain,
      'discoveryContexts.categoryPath': categoryPath
    }).toArray();
  }

  /**
   * Get variant information for a specific product type
   */
  async getVariantClusters(
    domain: string, 
    productType?: string
  ): Promise<VariantCluster[]> {
    const filter: any = { domain };
    if (productType) {
      filter.productType = productType;
    }

    const products = await this.products.find(filter).toArray();
    
    const clusters: VariantCluster[] = [];
    for (const product of products) {
      if (product.variants.colors.options.length > 0) {
        clusters.push(product.variants.colors);
      }
      if (product.variants.sizes.options.length > 0) {
        clusters.push(product.variants.sizes);
      }
      if (product.variants.styles.options.length > 0) {
        clusters.push(product.variants.styles);
      }
    }

    return clusters;
  }

  /**
   * Get selector patterns for a specific domain and page type
   */
  async getSelectorPatterns(
    domain: string, 
    pageType: PageType
  ): Promise<Record<string, any>> {
    const categories = await this.categories.find({ 
      domainId: domain 
    }).toArray();

    const patterns: Record<string, any> = {};

    for (const category of categories) {
      if (category.pageSelectors) {
        Object.entries(category.pageSelectors).forEach(([key, selector]) => {
          if (selector && selector.pageContext.pageType === pageType) {
            patterns[key] = {
              selector: selector.selector,
              fallbacks: selector.fallbackSelectors,
              reliability: selector.reliability.successRate
            };
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Update selector reliability based on usage
   */
  async updateSelectorReliability(
    domain: string,
    productId: string,
    selectorKey: string,
    success: boolean
  ): Promise<void> {
    const updateData = success ? 
      { 
        $inc: { [`reliability.selectorSuccessRates.${selectorKey}.successCount`]: 1 }
      } : 
      { 
        $inc: { [`reliability.selectorSuccessRates.${selectorKey}.failureCount`]: 1 }
      };

    await this.products.updateOne(
      { domain, productId },
      {
        ...updateData,
        $set: {
          [`reliability.selectorSuccessRates.${selectorKey}.lastUsed`]: new Date()
        }
      }
    );
  }
}