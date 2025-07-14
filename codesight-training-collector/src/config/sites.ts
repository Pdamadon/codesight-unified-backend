import { SiteConfig } from '../models/SiteConfig.js';

export const TARGET_CONFIG: SiteConfig = {
  name: 'target',
  baseUrl: 'https://target.com',
  framework: 'react',
  selectors: {
    search: '[data-test="@web/Search/SearchInput"]',
    navigation: ['[data-test="@web/CategoryCard"]', '[data-test="@web/GlobalHeader/Category"]'],
    products: ['[data-test="@web/site-top-of-funnel/ProductCard"]', '[data-test="product-card"]'],
    pagination: '[data-test="next-page"]',
    filters: ['[data-test="facet-filter"]', '[data-test="@web/Facets"]'],
    categoryMenu: '[data-test="@web/GlobalHeader/MainMenu"]',
    productGrid: '[data-test="@web/ProductGrid"]',
    productCard: '[data-test="@web/site-top-of-funnel/ProductCard"]'
  },
  categories: ['mens', 'womens', 'kids', 'home', 'electronics', 'beauty', 'toys', 'sports', 'grocery'],
  commonGoals: [
    'mens jeans',
    'womens shoes',
    'kids toys',
    'home decor',
    'electronics deals',
    'beauty products',
    'kitchen appliances',
    'bedding sets',
    'workout clothes',
    'baby clothes'
  ],
  extractionTargets: ['title', 'price', 'rating', 'availability', 'brand', 'imageUrl'],
  rateLimit: {
    requestsPerMinute: 30,
    delayBetweenRequests: 2000
  }
};

export const AMAZON_CONFIG: SiteConfig = {
  name: 'amazon',
  baseUrl: 'https://amazon.com',
  framework: 'server-rendered',
  selectors: {
    search: '#twotabsearchtextbox',
    navigation: ['[data-menu-id]', '.nav-category-menu'],
    products: ['[data-component-type="s-search-result"]', '.s-result-item'],
    pagination: '.s-pagination-next',
    filters: ['.s-facet-filter', '.a-section.a-spacing-none'],
    categoryMenu: '#nav-hamburger-menu',
    productGrid: '[data-component-type="s-search-results"]',
    productCard: '[data-component-type="s-search-result"]'
  },
  categories: ['electronics', 'clothing', 'home', 'books', 'toys', 'sports', 'automotive', 'health'],
  commonGoals: [
    'wireless headphones',
    'laptop computer',
    'kitchen utensils',
    'fiction books',
    'board games',
    'yoga mat',
    'car accessories',
    'vitamins'
  ],
  extractionTargets: ['title', 'price', 'rating', 'reviews', 'prime', 'imageUrl'],
  rateLimit: {
    requestsPerMinute: 20,
    delayBetweenRequests: 3000
  }
};

export const BESTBUY_CONFIG: SiteConfig = {
  name: 'bestbuy',
  baseUrl: 'https://bestbuy.com',
  framework: 'react',
  selectors: {
    search: '.header-search-input',
    navigation: ['.bottom-nav-item', '.hamburger-menu-flyout'],
    products: ['.sku-item', '.product-item'],
    pagination: '.sr-pagination .btn-next',
    filters: ['.facet-list', '.sr-facet'],
    categoryMenu: '.hamburger-menu',
    productGrid: '.results-page',
    productCard: '.sku-item'
  },
  categories: ['computers', 'mobile', 'tv', 'audio', 'gaming', 'appliances', 'smart-home'],
  commonGoals: [
    'gaming laptop',
    'smartphones',
    '4K TV',
    'bluetooth speakers',
    'PS5 games',
    'refrigerator',
    'smart thermostat'
  ],
  extractionTargets: ['title', 'price', 'rating', 'model', 'features', 'imageUrl'],
  rateLimit: {
    requestsPerMinute: 25,
    delayBetweenRequests: 2500
  }
};

export const WALMART_CONFIG: SiteConfig = {
  name: 'walmart',
  baseUrl: 'https://walmart.com',
  framework: 'react',
  selectors: {
    search: '[data-automation-id="searchbar-input"]',
    navigation: ['[data-automation-id="nav-link"]', '.GlobalNavigationMenuTrigger'],
    products: ['[data-automation-id="product-tile"]', '.search-result-gridview-item'],
    pagination: '[aria-label="next page"]',
    filters: ['[data-automation-id="facet"]', '.applied-filters'],
    categoryMenu: '[data-automation-id="hamburger-menu-trigger"]',
    productGrid: '[data-testid="search-result-content-grid"]',
    productCard: '[data-automation-id="product-tile"]'
  },
  categories: ['grocery', 'clothing', 'electronics', 'home', 'pharmacy', 'auto', 'baby', 'pets'],
  commonGoals: [
    'organic food',
    'jeans',
    'tablets',
    'furniture',
    'vitamins',
    'car oil',
    'baby formula',
    'dog food'
  ],
  extractionTargets: ['title', 'price', 'rating', 'pickup', 'delivery', 'imageUrl'],
  rateLimit: {
    requestsPerMinute: 35,
    delayBetweenRequests: 1800
  }
};

export const SITE_CONFIGS = {
  target: TARGET_CONFIG,
  amazon: AMAZON_CONFIG,
  bestbuy: BESTBUY_CONFIG,
  walmart: WALMART_CONFIG
} as const;

export type SiteName = keyof typeof SITE_CONFIGS;