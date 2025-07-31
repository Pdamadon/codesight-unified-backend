/**
 * NavigationAnalysisService
 * 
 * Handles all navigation and URL pattern analysis including:
 * - Navigation architecture extraction
 * - Category hierarchy analysis  
 * - URL pattern analysis
 * - Cross-page relationships
 * - Navigation patterns detection
 */

export interface INavigationAnalysisService {
  extractNavigationArchitecture(interactions: ParsedInteraction[], domain: string): NavigationArchitecture;
  extractCategoryHierarchy(interactions: ParsedInteraction[]): CategoryHierarchy;
  extractNavigationPatterns(interactions: ParsedInteraction[]): NavigationPatterns;
  extractCrossPageRelationships(interactions: ParsedInteraction[]): CrossPageRelationship[];
  analyzeUrlPatterns(interactions: ParsedInteraction[]): UrlPatternAnalysis;
}

export class NavigationAnalysisService implements INavigationAnalysisService {
  
  extractNavigationArchitecture(interactions: ParsedInteraction[], domain: string): NavigationArchitecture {
    console.log(`🧭 NAVIGATION_PARSER: Analyzing ${interactions.length} interactions for navigation architecture`);
    
    // Extract category hierarchy
    const categoryHierarchy = this.extractCategoryHierarchy(interactions);
    
    // Extract navigation patterns
    const navigationPatterns = this.extractNavigationPatterns(interactions);
    
    // Extract cross-page relationships
    const crossPageRelationships = this.extractCrossPageRelationships(interactions);
    
    // Analyze URL patterns
    const urlPatternAnalysis = this.analyzeUrlPatterns(interactions);
    
    // Calculate discovery metadata
    const discoveryMetadata = {
      totalNavigationPoints: categoryHierarchy.rootCategories.length + 
                            navigationPatterns.primaryNavigation.length + 
                            navigationPatterns.secondaryNavigation.length,
      hierarchyDepth: this.calculateHierarchyDepth(categoryHierarchy.categoryTree),
      navigationCoverage: this.calculateNavigationCoverage(interactions),
      extractedAt: new Date()
    };
    
    const navigationArchitecture: NavigationArchitecture = {
      categoryHierarchy,
      navigationPatterns,
      crossPageRelationships,
      urlPatternAnalysis,
      discoveryMetadata
    };
    
    console.log(`🧭 NAVIGATION_PARSER: Extracted navigation architecture`);
    console.log(`   Category Hierarchy: ${categoryHierarchy.rootCategories.length} root categories, depth ${discoveryMetadata.hierarchyDepth}`);
    console.log(`   Navigation Patterns: ${navigationPatterns.primaryNavigation.length} primary, ${navigationPatterns.secondaryNavigation.length} secondary`);
    console.log(`   Cross-Page Relationships: ${crossPageRelationships.length} relationships`);
    console.log(`   URL Patterns: ${urlPatternAnalysis.routingPatterns.length} routing patterns`);
    
    return navigationArchitecture;
  }

  extractCategoryHierarchy(interactions: ParsedInteraction[]): CategoryHierarchy {
    const categories = new Map<string, Category>();
    const categoryRelationships: CategoryRelationship[] = [];
    const breadcrumbPatterns: BreadcrumbPattern[] = [];
    
    // Find navigation-related interactions
    const navigationInteractions = interactions.filter(interaction => {
      const url = interaction.context?.url || '';
      const text = interaction.element?.text || '';
      
      // Look for category navigation (not product pages)
      return !url.includes('/productpage') && 
             (url.includes('/browse/') || 
              url.includes('/category/') || 
              url.includes('/men/') || 
              url.includes('/women/') ||
              this.isNavigationElement(interaction));
    });
    
    // Extract categories from navigation interactions
    navigationInteractions.forEach((interaction, index) => {
      const url = interaction.context?.url || '';
      const text = interaction.element?.text || '';
      
      if (text && url && interaction.type === 'CLICK') {
        const categoryPath = this.extractCategoryPathFromUrl(url);
        const categoryName = text.trim();
        
        if (categoryPath && categoryName) {
          const categoryId = `${categoryPath}-${Date.now()}-${index}`;
          const level = categoryPath.split('/').length - 1;
          
          const category: Category = {
            categoryId,
            categoryName,
            categoryPath,
            parentCategory: this.extractParentCategory(categoryPath),
            childCategories: [],
            level,
            selector: interaction.selectors?.primary || '',
            url,
            displayText: categoryName,
            isActive: true,
            interactionCount: 1,
            discoveredAt: new Date()
          };
          
          categories.set(categoryId, category);
          
          // Build category relationships
          if (category.parentCategory) {
            categoryRelationships.push({
              sourceCategory: category.parentCategory,
              targetCategory: categoryId,
              relationshipType: 'child',
              strength: 1.0,
              discoveredFrom: 'navigation'
            });
          }
        }
      }
    });
    
    // Build category tree
    const categoryTree = this.buildCategoryTree(Array.from(categories.values()));
    
    return {
      rootCategories: Array.from(categories.values()).filter(cat => cat.level === 0),
      categoryTree,
      breadcrumbPatterns,
      categoryRelationships
    };
  }

  extractNavigationPatterns(interactions: ParsedInteraction[]): NavigationPatterns {
    const primaryNavigation: NavigationElement[] = [];
    const secondaryNavigation: NavigationElement[] = [];
    const footerNavigation: NavigationElement[] = [];
    
    // Find navigation elements
    interactions.forEach((interaction, index) => {
      if (interaction.type !== 'CLICK') return;
      
      const element = interaction.element;
      if (!element?.text) return;
      
      const text = element.text.trim();
      const url = interaction.context?.url || '';
      const className = element.className || '';
      const selector = interaction.selectors?.primary || '';
      
      // Classify navigation type based on context
      let navigationType: 'primary' | 'secondary' | 'footer' = 'primary';
      
      if (className.includes('footer') || element.tag === 'footer') {
        navigationType = 'footer';
      } else if (className.includes('sub') || className.includes('secondary') || 
                 text.toLowerCase().includes('sale') || text.toLowerCase().includes('new')) {
        navigationType = 'secondary';
      }
      
      // Create navigation element
      const navElement: NavigationElement = {
        elementId: `nav-${index}-${Date.now()}`,
        elementType: this.determineElementType(element),
        text,
        selector,
        url: url,
        hasSubMenu: this.hasSubMenu(element, interactions),
        subMenuItems: [],
        position: { order: index, section: navigationType },
        interactionData: {
          clickCount: 1,
          userEngagement: this.calculateUserEngagement(text, interactions)
        }
      };
      
      // Add to appropriate navigation array
      switch (navigationType) {
        case 'primary':
          primaryNavigation.push(navElement);
          break;
        case 'secondary':
          secondaryNavigation.push(navElement);
          break;
        case 'footer':
          footerNavigation.push(navElement);
          break;
      }
    });
    
    return {
      primaryNavigation,
      secondaryNavigation,
      footerNavigation
    };
  }

  extractCrossPageRelationships(interactions: ParsedInteraction[]): CrossPageRelationship[] {
    // Implementation to be added
    return [];
  }

  analyzeUrlPatterns(interactions: ParsedInteraction[]): UrlPatternAnalysis {
    // Implementation to be added
    return {
      routingPatterns: [],
      parameterPatterns: [],
      navigationFlows: []
    };
  }

  // Private helper methods
  private isNavigationElement(interaction: ParsedInteraction): boolean {
    const element = interaction.element;
    if (!element) return false;
    
    const hasNavText = element.text && 
      (element.text.toLowerCase().includes('menu') ||
       element.text.toLowerCase().includes('nav') ||
       element.text.toLowerCase().includes('home') ||
       element.text.toLowerCase().includes('category'));
    
    const hasNavClass = element.className &&
      (element.className.includes('nav') ||
       element.className.includes('menu') ||
       element.className.includes('header'));
    
    return !!(hasNavText || hasNavClass);
  }

  private extractCategoryPathFromUrl(url: string): string | null {
    const patterns = [
      /\/browse\/(.+)/,
      /\/category\/(.+)/,
      /\/(men|women|kids)\/(.+)/,
      /\/c\/(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }
    
    return null;
  }

  private extractParentCategory(categoryPath: string): string | undefined {
    const parts = categoryPath.split('/');
    if (parts.length > 1) {
      parts.pop(); // Remove the last part
      return parts.join('/');
    }
    return undefined;
  }

  private buildCategoryTree(categories: Category[]): CategoryNode[] {
    // Simple tree building - can be enhanced
    return categories.map(cat => ({
      category: cat,
      children: [],
      depth: cat.level
    }));
  }

  private calculateHierarchyDepth(categoryTree: CategoryNode[]): number {
    if (!categoryTree.length) return 0;
    return Math.max(...categoryTree.map(node => node.depth)) + 1;
  }

  private calculateNavigationCoverage(interactions: ParsedInteraction[]): string {
    const uniqueUrls = new Set(interactions.map(i => i.context?.url).filter(Boolean));
    return `${uniqueUrls.size} unique pages`;
  }

  private determineElementType(element: any): 'link' | 'button' | 'dropdown' | 'menu' {
    if (element.tag === 'a') return 'link';
    if (element.tag === 'button') return 'button';
    if (element.className?.includes('dropdown')) return 'dropdown';
    return 'menu';
  }

  private hasSubMenu(element: any, interactions: ParsedInteraction[]): boolean {
    // Simple check - can be enhanced
    return element.className?.includes('dropdown') || element.className?.includes('menu');
  }

  private calculateUserEngagement(text: string, interactions: ParsedInteraction[]): 'high' | 'medium' | 'low' {
    // Count interactions with this text
    const count = interactions.filter(i => i.element?.text === text).length;
    if (count > 3) return 'high';
    if (count > 1) return 'medium';
    return 'low';
  }

  private classifyPageType(url: string): string {
    if (url.includes('/productpage') || url.includes('/product/')) return 'product';
    if (url.includes('/browse/') || url.includes('/category/')) return 'category';
    if (url.includes('/cart') || url.includes('/checkout')) return 'checkout';
    if (url.includes('/search')) return 'search';
    if (url === '/' || url.includes('/home')) return 'homepage';
    return 'other';
  }
}

// Type definitions (temporary - will be imported from proper types file)
interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  timestamp: number;
  selectors: any;
}

interface NavigationArchitecture {
  categoryHierarchy: CategoryHierarchy;
  navigationPatterns: NavigationPatterns;
  crossPageRelationships: CrossPageRelationship[];
  urlPatternAnalysis: UrlPatternAnalysis;
  discoveryMetadata: any;
}

interface CategoryHierarchy {
  rootCategories: Category[];
  categoryTree: CategoryNode[];
  breadcrumbPatterns: BreadcrumbPattern[];
  categoryRelationships: CategoryRelationship[];
}

interface Category {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  parentCategory?: string;
  childCategories: string[];
  level: number;
  selector: string;
  url: string;
  displayText: string;
  isActive: boolean;
  interactionCount: number;
  discoveredAt: Date;
}

interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  depth: number;
}

interface CategoryRelationship {
  sourceCategory: string;
  targetCategory: string;
  relationshipType: string;
  strength: number;
  discoveredFrom: string;
}

interface BreadcrumbPattern {
  pageType: string;
  breadcrumbStructure: BreadcrumbElement[];
  separator: string;
  containerSelector: string;
  itemSelector: string;
}

interface BreadcrumbElement {
  text: string;
  url?: string;
  isClickable: boolean;
  position: number;
  isCurrentPage: boolean;
}

interface NavigationPatterns {
  primaryNavigation: NavigationElement[];
  secondaryNavigation: NavigationElement[];
  footerNavigation: NavigationElement[];
}

interface NavigationElement {
  elementId: string;
  elementType: 'link' | 'button' | 'dropdown' | 'menu';
  text: string;
  selector: string;
  url: string;
  hasSubMenu: boolean;
  subMenuItems: any[];
  position: { order: number; section: string };
  interactionData: {
    clickCount: number;
    userEngagement: 'high' | 'medium' | 'low';
  };
}

interface CrossPageRelationship {
  // Will be defined
}

interface UrlPatternAnalysis {
  routingPatterns: any[];
  parameterPatterns: any[];
  navigationFlows: any[];
}