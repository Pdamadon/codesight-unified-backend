/**
 * World Model Database Schema
 * Hierarchical structure: Domain → Category → Product → Selector
 * 
 * This schema defines the structure for storing site-specific knowledge
 * to eliminate selector guessing and enable reliable e-commerce automation.
 */

export interface WorldModelDomain {
  _id?: string;
  
  // Domain identification
  domain: string;                    // "gap.com", "amazon.com"
  siteType: SiteType;               // ecommerce, marketplace, corporate
  siteName: string;                 // "Gap", "Amazon"
  
  // Global site patterns
  globalSelectors: {
    searchBar?: SelectorInfo;
    cartIcon?: SelectorInfo;
    navigationMenu?: SelectorInfo;
    loginButton?: SelectorInfo;
    userAccount?: SelectorInfo;
  };
  
  // Site-wide patterns
  layoutPatterns: {
    hasTopNavigation: boolean;
    hasSideNavigation: boolean;
    hasFooterNavigation?: boolean;
    responsiveBreakpoints: number[];
  };
  
  // Authentication & security
  authenticationFlow: {
    loginUrl: string;
    signupUrl: string;
    guestCheckoutAvailable: boolean;
    socialLoginOptions: string[];
  };
  
  // URL patterns for different page types
  urlPatterns: {
    category: string[];              // ["/browse/{category}", "/men/{subcategory}"]
    product: string[];               // ["/product/{id}", "/browse/product.do?pid={id}"]
    search: string[];                // ["/search?q={query}"]
    sale: string[];                  // ["/sale", "/clearance"]
  };
  
  // Reliability metrics
  reliability: {
    overallSuccessRate: number;      // 0.0 - 1.0
    totalInteractions: number;
    successfulInteractions?: number;
    lastValidated: Date;
    avgResponseTime?: number;        // milliseconds
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastScrapedAt?: Date;
  isActive: boolean;
}

export interface WorldModelCategory {
  _id?: string;
  
  // Hierarchy
  domainId: string;                 // Reference to WorldModelDomain
  categoryPath: string;             // "men/shirts/casual" or "sale/mens"
  categoryName: string;             // "Men's Casual Shirts"
  categoryType: CategoryType;       // regular, sale, search, featured
  parentCategoryPath?: string;      // "men/shirts"
  childCategories: string[];        // ["men/shirts/dress", "men/shirts/polo"]
  
  // Multiple discovery contexts (for deduplication)
  discoveryContexts: CategoryDiscoveryContext[];
  
  // URL patterns
  urlPatterns: string[];            // ["/browse/men/shirts/casual", "/men/shirts?category=casual"]
  canonicalUrl: string;
  
  // Page-specific selectors
  pageSelectors?: {
    productGrid?: SelectorInfo;
    productCard?: SelectorInfo;
    productTitle?: SelectorInfo;
    productPrice?: SelectorInfo;
    productImage?: SelectorInfo;
    productLink?: SelectorInfo;
    
    // Filtering & sorting
    priceFilter?: SelectorInfo;
    colorFilter?: SelectorInfo;
    sizeFilter?: SelectorInfo;
    brandFilter?: SelectorInfo;
    sortDropdown?: SelectorInfo;
    
    // Navigation
    pagination?: SelectorInfo;
    loadMoreButton?: SelectorInfo;
    breadcrumbs?: SelectorInfo;
    resultsCount?: SelectorInfo;
  };
  
  // Product discovery patterns
  productDiscoveryRules: {
    expectedProductTypes: string[];   // ["shirts", "pants"] vs ["mixed"]
    siblingContext: SiblingContext;   // homogeneous, mixed, unknown
    averageProductsPerPage: number;
    paginationPattern: string;        // "numbered", "infinite_scroll", "load_more"
  };
  
  // Business context
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  
  // Navigation context
  navigationFlow: {
    commonEntryPoints: string[];     // How users typically arrive
    commonExitPoints: string[];      // Where they typically go next
    averageTimeOnPage: number;       // seconds
  };
  
  // Sibling category relationships (discovered from spatial context)
  siblingCategories: SiblingCategory[];
  
  // Spatial navigation context
  spatialNavigationContext: {
    spatialRelationships: CategorySpatialInfo[];
    menuStructure?: MenuHierarchy;
    navigationLevel: number;         // How deep in navigation hierarchy
    breadcrumbs?: string[];          // Breadcrumb trail
  };
  
  // Reliability metrics
  reliability: {
    successRate: number;
    totalAttempts: number;
    lastVerified: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface WorldModelProduct {
  _id?: string;
  
  // Product identification (unique across contexts)
  domain: string;
  productId: string;                // Site's internal product ID
  productName: string;
  sku?: string;
  productType: string;              // "shirt", "pants", "shoes"
  
  // Multiple discovery contexts
  discoveryContexts: ProductDiscoveryContext[];
  
  // Current product state
  currentState: {
    price: number;
    currency: string;
    availability: ProductAvailability;
    lastPriceUpdate: Date;
    inStock: boolean;
  };
  
  // Product URLs and images
  urls: {
    canonical: string;
    mobile?: string;
    variants: ProductUrl[];          // Different URLs for different variants
  };
  
  images: {
    primary: string;
    gallery: string[];
    variants: Record<string, string[]>; // Color-specific images
  };
  
  // Variant information (complete clusters)
  variants: {
    colors: VariantCluster;
    sizes: VariantCluster;
    styles: VariantCluster;
  };
  
  // Product page selectors
  pageSelectors: {
    productTitle: SelectorInfo;
    productPrice: SelectorInfo;
    productImages: SelectorInfo;
    productDescription: SelectorInfo;
    
    // Variant selectors (complete clusters)
    colorSelection: VariantCluster;
    sizeSelection: VariantCluster;
    styleSelection: VariantCluster;
    
    // Action selectors
    addToCartButton: SelectorInfo;
    wishlistButton?: SelectorInfo;
    shareButton?: SelectorInfo;
    stockStatus: SelectorInfo;
    shippingInfo?: SelectorInfo;
    reviewsSection?: SelectorInfo;
  };
  
  // Interaction workflows
  workflows: {
    addToCart: WorkflowStep[];
    selectVariant: WorkflowStep[];
    viewReviews: WorkflowStep[];
  };
  
  // Relationship data (from sibling discovery)
  relationships: {
    similarProducts: string[];       // Product IDs found as siblings
    crossSellProducts: string[];     // Products shown together
    categoryMates: string[];         // Products in same category
  };
  
  // Reliability and usage
  reliability: {
    selectorSuccessRates: Record<string, number>;
    totalInteractions: number;
    lastVerified: Date;
    lastSeen: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ProductDiscoveryContext {
  categoryPath: string;             // Where it was discovered
  pageType: PageType;               // category, sale, search, etc.
  siblingContext: SiblingContext;   // homogeneous, mixed
  
  // Position and context
  positionOnPage: number;
  totalProductsOnPage: number;
  discoveredAt: Date;
  
  // Sibling products discovered at same time
  discoveredSiblings: SiblingProduct[];
  
  // Context-specific data
  contextSpecificData: {
    originalPrice?: number;         // If on sale page
    discountPercent?: number;       // If on sale page
    searchQuery?: string;           // If from search results
    filterApplied?: string[];       // Active filters when discovered
  };
  
  // Spatial context from discovery
  spatialContext: {
    nearbyElements: SpatialElement[];
    gridPosition?: { row: number; col: number };
    section?: string;               // "featured", "recommended", "new-arrivals"
  };
}

export interface SiblingProduct {
  productId: string;
  productName: string;
  selector: string;                 // How to find this sibling
  relativePosition: string;         // "left", "right", "above", "below"
  distance: number;                 // Pixels between elements
  discoveredAt: Date;
}

export interface CategoryDiscoveryContext {
  discoveredFrom: string;           // Category path where this was discovered
  discoveryType: CategoryDiscoveryType; // primary, sibling, child, parent
  spatialPosition?: string;         // "above, 44px", "right, 32px"
  discoveredAt: Date;
  
  // Context-specific data
  contextData: {
    menuLevel?: number;             // Navigation depth when discovered
    section?: string;               // "main-nav", "footer", "sidebar"
    interactionType?: string;       // "click", "hover", "visible"
  };
  
  // Spatial context from discovery
  spatialContext: {
    nearbyCategories: NearbyCategoryElement[];
    menuStructure?: string;         // "horizontal", "vertical", "dropdown"
  };
}

export interface SiblingCategory {
  categoryPath: string;
  categoryName: string;
  selector: string;                 // How to find this sibling category
  relativePosition: string;         // "left", "right", "above", "below"
  distance: number;                 // Pixels between elements
  discoveredAt: Date;
  
  // Additional context
  menuLevel: number;                // Navigation hierarchy level
  isActive?: boolean;               // Was this the current/active category
}

export interface CategorySpatialInfo {
  relationshipType: CategoryRelationshipType;
  relatedCategoryPath: string;
  spatialDescription: string;       // "directly above", "in same menu level"
  confidence: number;               // 0.0 - 1.0
  discoveredAt: Date;
}

export interface MenuHierarchy {
  level: number;                    // 0 = top level, 1 = submenu, etc.
  parentMenu?: string;              // Parent menu selector
  menuType: MenuType;               // horizontal, vertical, dropdown, mega
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface NearbyCategoryElement {
  selector: string;
  categoryName: string;
  elementType: string;              // "link", "button", "div"
  relativePosition: string;         // "left", "right", "above", "below"
  distance: number;                 // pixels
  text?: string;
}

export interface VariantCluster {
  type: VariantType;                // color, size, style
  containerSelector: string;        // Parent container
  selectorPattern: string;          // Template: "#buybox-color-swatch--{VALUE}"
  
  // All available options
  options: VariantOption[];
  
  // Layout information
  layout: {
    arrangement: VariantLayout;     // horizontal_row, vertical_list, grid
    spatialPattern: string;         // How options are positioned
  };
  
  // Discovery metadata
  discoveryInfo: {
    discoveredFromSiblings: boolean;
    totalOptionsFound: number;
    discoveredAt: Date;
    reliability: number;
  };
}

export interface VariantOption {
  value: string;                    // "Red", "Large", "Cotton"
  displayName: string;
  selector: string;                 // Specific selector for this option
  selectorType: SelectorType;
  
  // Availability and state
  availability: VariantAvailability;
  inStock: boolean;
  priceModifier?: number;           // +$5 for premium colors
  
  // Visual/spatial context
  spatialInfo: {
    position: number;               // Order in the variant group
    coordinates?: { x: number; y: number };
    boundingBox?: BoundingBox;
  };
  
  // Additional metadata
  attributes: Record<string, any>;  // Color codes, measurements, etc.
  lastVerified: Date;
}

export interface SelectorInfo {
  // Primary selector
  selector: string;
  selectorType: SelectorType;       // css, xpath, aria-label, data-testid
  
  // Fallback chain
  fallbackSelectors: string[];
  
  // Context requirements
  pageContext: {
    pageType: PageType;
    requiredState?: string[];        // ["product_loaded", "color_selected"]
    prerequisites?: string[];        // Actions that must happen first
    spatialContext?: string;         // "near_add_to_cart_button"
  };
  
  // Pattern information (for dynamic selectors)
  pattern?: {
    template: string;               // "#{productId}-color-{color}"
    variables: string[];            // ["productId", "color"]
    examples: string[];             // Filled template examples
  };
  
  // Reliability data
  reliability: {
    successRate: number;             // 0.0 - 1.0
    totalAttempts: number;
    successCount: number;
    lastUsed: Date;
    avgResponseTime: number;         // milliseconds
  };
  
  // Usage context
  interactionType: InteractionType; // click, input, scroll, hover
  expectedBehavior: string;         // "opens_modal", "updates_price", "adds_to_cart"
  
  // Validation rules
  validation: {
    textContent?: string;            // Expected text content
    attributes?: Record<string, string>; // Expected attributes
    boundingBox?: BoundingBox;       // Expected position/size constraints
  };
}

export interface WorkflowStep {
  stepNumber: number;
  action: string;                   // "select_color", "click_add_to_cart"
  selector: string;
  prerequisites: string[];          // Previous steps required
  expectedOutcome: string;          // What should happen after this step
  errorHandling: string[];          // Common error scenarios and responses
  
  // Context from discovery
  contextNotes: string;
  alternativeApproaches: string[];
}

export interface ProductUrl {
  variantType: string;              // "color", "size"
  variantValue: string;
  url: string;
}

export interface SpatialElement {
  selector: string;
  elementType: string;
  relativePosition: string;         // "left", "right", "above", "below"
  distance: number;                 // pixels
  text?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Enums
export enum SiteType {
  ECOMMERCE = 'ecommerce',
  MARKETPLACE = 'marketplace', 
  CORPORATE = 'corporate',
  CONTENT = 'content',
  SAAS = 'saas'
}

export enum CategoryType {
  REGULAR = 'regular',              // "men/shirts"
  SALE = 'sale',                    // "sale/mens"
  SEARCH = 'search',                // Search results
  FEATURED = 'featured',            // "new-arrivals", "trending"
  MIXED = 'mixed'                   // Pages with multiple product types
}

export enum PageType {
  HOMEPAGE = 'homepage',
  CATEGORY = 'category',
  PRODUCT_DETAIL = 'product-detail',
  SEARCH_RESULTS = 'search-results',
  SALE = 'sale',
  CART = 'cart',
  CHECKOUT = 'checkout',
  LOGIN = 'login',
  ACCOUNT = 'account'
}

export enum SiblingContext {
  HOMOGENEOUS = 'homogeneous',      // All same product type
  MIXED = 'mixed',                  // Different product types
  UNKNOWN = 'unknown'
}

export enum VariantType {
  COLOR = 'color',
  SIZE = 'size',
  STYLE = 'style',
  MATERIAL = 'material'
}

export enum VariantLayout {
  HORIZONTAL_ROW = 'horizontal_row',
  VERTICAL_LIST = 'vertical_list',
  GRID = 'grid',
  DROPDOWN = 'dropdown'
}

export enum SelectorType {
  CSS = 'css',
  XPATH = 'xpath',
  ARIA_LABEL = 'aria-label',
  DATA_TESTID = 'data-testid',
  TEXT_CONTENT = 'text-content',
  ID = 'id',
  CLASS = 'class'
}

export enum InteractionType {
  CLICK = 'click',
  INPUT = 'input',
  SCROLL = 'scroll',
  HOVER = 'hover',
  DRAG = 'drag',
  DROP = 'drop',
  KEY_PRESS = 'key-press',
  FORM_SUBMIT = 'form-submit',
  WAIT = 'wait'
}

export enum VariantAvailability {
  IN_STOCK = 'in_stock',
  OUT_OF_STOCK = 'out_of_stock',
  LOW_STOCK = 'low_stock',
  PREORDER = 'preorder',
  DISCONTINUED = 'discontinued'
}

export enum ProductAvailability {
  AVAILABLE = 'available',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  LIMITED = 'limited'
}

export enum CategoryDiscoveryType {
  PRIMARY = 'primary',              // Clicked/navigated to directly
  SIBLING = 'sibling',              // Found as sibling of another category
  CHILD = 'child',                  // Found as child/subcategory
  PARENT = 'parent',                // Found as parent category
  BREADCRUMB = 'breadcrumb'         // Found in breadcrumb navigation
}

export enum CategoryRelationshipType {
  SIBLING = 'sibling',              // Same level categories
  PARENT_CHILD = 'parent_child',    // Hierarchical relationship
  CROSS_REFERENCE = 'cross_reference', // Categories that reference each other
  MENU_NEIGHBOR = 'menu_neighbor'   // Adjacent in navigation menu
}

export enum MenuType {
  HORIZONTAL = 'horizontal',        // Top navigation bar
  VERTICAL = 'vertical',            // Side navigation
  DROPDOWN = 'dropdown',            // Dropdown menu
  MEGA = 'mega',                    // Mega menu with multiple columns
  BREADCRUMB = 'breadcrumb',        // Breadcrumb navigation
  FOOTER = 'footer'                 // Footer navigation
}

// Collection indexes for MongoDB
export const WorldModelIndexes = {
  domains: [
    { domain: 1 },
    { siteType: 1 },
    { 'reliability.overallSuccessRate': -1 },
    { updatedAt: -1 }
  ],
  categories: [
    { domainId: 1, categoryPath: 1 },
    { domainId: 1, parentCategoryPath: 1 },
    { domainId: 1, categoryType: 1 },
    { 'reliability.successRate': -1 },
    { updatedAt: -1 }
  ],
  products: [
    { domain: 1, productId: 1 },     // Unique product lookup
    { domain: 1, productName: 1 },   // Name-based deduplication
    { 'discoveryContexts.categoryPath': 1 }, // Context-specific queries
    { 'currentState.lastPriceUpdate': -1 }, // Recent price updates
    { 'reliability.lastSeen': -1 }, // Recently active products
    { productType: 1 },             // Product type filtering
    { 'variants.colors.options.value': 1 }, // Variant searches
    { 'variants.sizes.options.value': 1 },  // Size searches
    { updatedAt: -1 }
  ]
};

// Collection names
export const Collections = {
  DOMAINS: 'world_model_domains',
  CATEGORIES: 'world_model_categories', 
  PRODUCTS: 'world_model_products'
};