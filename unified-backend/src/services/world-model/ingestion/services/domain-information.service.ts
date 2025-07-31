/**
 * DomainInformationService
 * 
 * Handles domain-specific information extraction including:
 * - Domain information analysis
 * - Site structure analysis
 * - Navigation pattern identification
 * - Page type classification
 * - UI framework detection
 */

// import { DomainInformation } from '../types/world-model-types';

export interface IDomainInformationService {
  extractDomainInformation(interactions: ParsedInteraction[], domain: string): DomainInformation;
  identifyNavigationPatterns(interactions: ParsedInteraction[]): string[];
  classifyPageTypes(interactions: ParsedInteraction[], urlPatterns: Map<string, number>): DomainInformation['pageTypes'];
  detectUIFramework(classPatterns: Map<string, number>): string | undefined;
  analyzeSiteStructure(interactions: ParsedInteraction[]): SiteStructure;
}

export class DomainInformationService implements IDomainInformationService {
  
  extractDomainInformation(interactions: ParsedInteraction[], domain: string): DomainInformation {
    console.log(`🏢 DOMAIN_INFO_PARSER: Analyzing ${interactions.length} interactions for domain: ${domain}`);
    
    // Extract URL patterns
    const urls = interactions.map(i => i.context?.url).filter(Boolean);
    const urlPatterns = new Map<string, number>();
    
    urls.forEach(url => {
      const pattern = this.extractCommonUrlPattern([url]);
      urlPatterns.set(pattern, (urlPatterns.get(pattern) || 0) + 1);
    });
    
    // Classify page types
    const pageTypes = this.classifyPageTypes(interactions, urlPatterns);
    
    return {
      domain: this.extractDomainName(domain),
      siteType: 'ecommerce',
      pageTypes,
      siteCoverage: {
        totalPages: new Set(urls).size,
        crawledPages: new Set(urls).size,
        lastCrawlDate: new Date()
      },
      siteStructure: {
        patterns: Array.from(urlPatterns.keys()),
        selectors: this.extractElementPatterns(interactions)
      },
      reliability: {
        overallSuccessRate: 0.9,
        lastVerified: new Date(),
        totalSessions: 1
      }
    };
  }

  identifyNavigationPatterns(interactions: ParsedInteraction[]): string[] {
    const patterns: string[] = [];
    
    interactions.forEach(i => {
      const url = i.context?.url || '';
      if (url.includes('/browse/') || url.includes('/category/')) {
        patterns.push('category_navigation');
      }
      if (url.includes('/product/') || url.includes('/p/')) {
        patterns.push('product_navigation');
      }
    });
    
    return [...new Set(patterns)];
  }

  classifyPageTypes(interactions: ParsedInteraction[], urlPatterns: Map<string, number>): any {
    const pageTypes: any = {};
    
    interactions.forEach(i => {
      const url = i.context?.url || '';
      let pageType = 'other';
      
      if (url.includes('/product') || url.includes('/p/')) pageType = 'product';
      else if (url.includes('/browse') || url.includes('/category')) pageType = 'category';
      else if (url.includes('/cart') || url.includes('/checkout')) pageType = 'checkout';
      else if (url === '/' || url.includes('/home')) pageType = 'homepage';
      
      pageTypes[pageType] = (pageTypes[pageType] || 0) + 1;
    });
    
    return pageTypes;
  }

  detectUIFramework(classPatterns: Map<string, number>): string | undefined {
    for (const [className] of classPatterns) {
      if (className.includes('react')) return 'React';
      if (className.includes('vue')) return 'Vue';
      if (className.includes('angular')) return 'Angular';
      if (className.includes('bootstrap')) return 'Bootstrap';
    }
    return undefined;
  }

  analyzeSiteStructure(interactions: ParsedInteraction[]): SiteStructure {
    return {
      patterns: this.extractCommonUrlPatterns(interactions),
      selectors: this.extractElementPatterns(interactions)
    };
  }

  // Private helper methods will be moved here
  private extractDomainName(domain: string): string {
    return domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }

  private calculateSessionCoverage(interactions: ParsedInteraction[]): string {
    const uniqueUrls = new Set(interactions.map(i => i.context?.url).filter(Boolean));
    return `${uniqueUrls.size} unique pages`;
  }

  private extractCommonUrlPattern(urls: string[]): string {
    if (urls.length === 0) return '';
    
    const url = urls[0];
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').slice(0, 2).join('/');
    } catch (e) {
      return url.split('/').slice(0, 3).join('/');
    }
  }

  private extractCommonUrlPatterns(interactions: ParsedInteraction[]): string[] {
    const urls = interactions.map(i => i.context?.url).filter(Boolean);
    const patterns = urls.map(url => this.extractCommonUrlPattern([url]));
    return [...new Set(patterns)];
  }

  private extractElementPatterns(interactions: ParsedInteraction[]): string[] {
    const selectors = interactions.map(i => i.selectors?.primary).filter(Boolean);
    return [...new Set(selectors)];
  }
}

// Type definitions
interface DomainInformation {
  domain: string;
  siteType: string;
  pageTypes: any;
  siteCoverage: any;
  siteStructure: SiteStructure;
  reliability: any;
}

interface SiteStructure {
  patterns: string[];
  selectors: string[];
}

interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  timestamp: number;
  selectors: any;
}