/**
 * Visual Context Service
 * 
 * Extracted from training-data-transformer.ts to provide focused visual context functionality
 * for training data generation.
 * 
 * Handles visual elements, design systems, nearby elements spatial relationships,
 * and visual styling context for enhanced AI training.
 */

export interface VisualContextService {
  extractVisualContext(visual: any): any;
  extractDesignSystemContext(designSystem: any): any;
  extractCompleteNearbyElements(nearbyElements: any[]): any;
  buildSpatialContext(nearbyElements: any[], boundingBox?: any): string;
}

export class VisualContextServiceImpl implements VisualContextService {

  /**
   * EXTRACTED: Extract comprehensive visual context from interaction data
   */
  extractVisualContext(visual: any): any {
    const context: any = {};
    
    if (visual?.boundingBox) {
      context.positioning = `(${visual.boundingBox.x},${visual.boundingBox.y}) ${visual.boundingBox.width}×${visual.boundingBox.height}`;
    }
    
    if (visual?.colors) {
      context.colors = `bg:${visual.colors.background || 'auto'} txt:${visual.colors.text || 'auto'} border:${visual.colors.border || 'auto'}`;
    }
    
    if (visual?.typography) {
      context.typography = `${visual.typography.fontSize || '16px'} ${visual.typography.fontFamily || 'default'} ${visual.typography.fontWeight || 'normal'}`;
    }
    
    if (visual?.layout) {
      context.layout = `${visual.layout.display || 'block'} ${visual.layout.position || 'static'}`;
    }
    
    if (visual?.animations) {
      context.animations = visual.animations.hasAnimations ? 
        `${visual.animations.animationType} ${visual.animations.duration}ms` : 'static';
    }
    
    context.deviceType = visual?.deviceType || 'desktop';
    
    // Enhanced visibility detection
    context.visibility = this.determineVisibility(visual);
    
    // Enhanced responsive context
    if (visual?.responsive) {
      context.responsive = this.extractResponsiveContext(visual.responsive);
    }
    
    return context;
  }

  /**
   * EXTRACTED: Extract design system context for UI pattern recognition
   */
  extractDesignSystemContext(designSystem: any): any {
    const context: any = {
      summary: '',
      componentLibrary: '',
      brandColors: '',
      designPatterns: '',
      framework: ''
    };
    
    if (!designSystem) {
      return { 
        summary: 'no-design-system', 
        componentLibrary: 'unknown', 
        brandColors: 'default', 
        designPatterns: 'basic' 
      };
    }
    
    // Component library detection
    context.componentLibrary = designSystem.componentLibrary || 
      designSystem.uiFramework || 'custom';
    
    // Brand colors summary
    if (designSystem.brandColors) {
      const colors = [];
      if (designSystem.brandColors.primary) colors.push(`primary:${designSystem.brandColors.primary}`);
      if (designSystem.brandColors.secondary) colors.push(`secondary:${designSystem.brandColors.secondary}`);
      if (designSystem.brandColors.accent) colors.push(`accent:${designSystem.brandColors.accent}`);
      context.brandColors = colors.length > 0 ? colors.join(' ') : 'default-colors';
    } else {
      context.brandColors = 'default-colors';
    }
    
    // Design patterns
    context.designPatterns = designSystem.designPatterns?.slice(0, 3).join(' ') || 'basic-patterns';
    
    // Framework summary
    const frameworks = [];
    if (designSystem.uiFramework) frameworks.push(designSystem.uiFramework);
    if (designSystem.cssFramework) frameworks.push(designSystem.cssFramework);
    context.framework = frameworks.join('+') || 'vanilla';
    
    // Overall summary
    context.summary = `${context.componentLibrary} ${context.framework} ${context.designPatterns}`;
    
    return context;
  }

  /**
   * EXTRACTED: Extract comprehensive nearby elements context with complete selector information
   */
  extractCompleteNearbyElements(nearbyElements: any[]): any {
    const context: any = {
      spatialSummary: '',
      relationships: '',
      interactionTargets: '',
      elementTypes: '',
      accessibility: '',
      allElementSelectors: [],
      completeElementMap: {}
    };
    
    if (!nearbyElements || nearbyElements.length === 0) {
      return { 
        spatialSummary: 'no-nearby', 
        relationships: 'isolated', 
        interactionTargets: 'none', 
        allElementSelectors: [] 
      };
    }
    
    // Use ALL nearby elements (up to 15) with complete selector info
    const allElements = nearbyElements.slice(0, 15);
    
    // Extract complete element information including selectors
    const completeElementInfo = allElements.map(el => {
      return {
        text: el.text || el.tagName || 'element',
        tagName: el.tagName || 'unknown',
        selector: el.selector || `${el.tagName || 'element'}`,
        distance: el.distance || 0,
        direction: el.direction || el.relationship || 'unknown',
        isInteractive: el.isInteractive !== false, // Default to true if not specified
        isVisible: el.isVisible !== false, // Default to true if not specified
        boundingBox: el.boundingBox || null,
        attributes: el.attributes || {},
        elementType: el.elementType || el.tagName || 'element'
      };
    });
    
    // Store complete element map for rich context
    context.completeElementMap = completeElementInfo.reduce((map: Record<string, any>, el, index) => {
      map[`element_${index}`] = el;
      return map;
    }, {} as Record<string, any>);
    
    // Extract all selectors for training data (KEY ENHANCEMENT!)
    context.allElementSelectors = completeElementInfo.map(el => ({
      text: el.text,
      selector: el.selector,
      tagName: el.tagName,
      distance: el.distance,
      direction: el.direction,
      interactive: el.isInteractive
    }));
    
    // Enhanced spatial summary with selectors and interaction capability
    const spatialDescriptions = completeElementInfo.slice(0, 5).map(el => {
      const interactiveSymbol = el.isInteractive ? '✓' : '○';
      const visibleSymbol = el.isVisible ? '👁' : '🚫';
      const directionText = el.direction || 'near';
      const distanceText = el.distance ? `${el.distance}px` : 'close';
      
      return `${el.tagName}:${el.text} ${interactiveSymbol}${visibleSymbol} (${directionText}, ${distanceText}) [${el.selector.slice(0, 20)}${el.selector.length > 20 ? '...' : ''}]`;
    });
    context.spatialSummary = spatialDescriptions.join(', ');
    
    // Enhanced relationships analysis
    const interactiveElements = completeElementInfo.filter(el => el.isInteractive);
    const groupedByDirection = this.groupElementsByDirection(completeElementInfo);
    context.relationships = this.buildRelationshipsDescription(groupedByDirection);
    
    // Enhanced interaction targets
    const primaryTargets = interactiveElements.slice(0, 3);
    context.interactionTargets = primaryTargets.map(el => 
      `${el.text}[${el.selector}]`
    ).join(', ') || 'none';
    
    // Element types summary
    const elementTypes = [...new Set(completeElementInfo.map(el => el.elementType))];
    context.elementTypes = elementTypes.slice(0, 5).join(', ');
    
    // Accessibility context
    const a11yElements = completeElementInfo.filter(el => 
      el.attributes?.role || el.attributes?.['aria-label'] || el.attributes?.['aria-labelledby']
    );
    context.accessibility = a11yElements.length > 0 ? 
      `${a11yElements.length} accessible elements` : 'basic accessibility';
    
    return context;
  }

  /**
   * EXTRACTED: Build spatial context description from nearby elements
   */
  buildSpatialContext(nearbyElements: any[], boundingBox?: any): string {
    if (nearbyElements.length === 0) return '';
    
    return nearbyElements.slice(0, 3).map(el => 
      `${el.relationship || 'near'} "${el.text}" (${el.distance || 'close'})`
    ).join(', ');
  }

  // Helper methods
  private determineVisibility(visual: any): string {
    if (visual?.isVisible === false) return 'Hidden';
    if (visual?.opacity !== undefined && visual.opacity < 0.1) return 'Transparent';
    if (visual?.display === 'none') return 'Display None';
    if (visual?.visibility === 'hidden') return 'Visibility Hidden';
    
    return 'Visible';
  }

  private extractResponsiveContext(responsive: any): string {
    const breakpoints = [];
    
    if (responsive.mobile) breakpoints.push('mobile');
    if (responsive.tablet) breakpoints.push('tablet');
    if (responsive.desktop) breakpoints.push('desktop');
    
    const currentBreakpoint = responsive.currentBreakpoint || 'unknown';
    
    return `${currentBreakpoint} (supports: ${breakpoints.join(', ')})`;
  }

  private groupElementsByDirection(elements: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {
      above: [],
      below: [],
      left: [],
      right: [],
      near: []
    };
    
    elements.forEach(el => {
      const direction = el.direction || 'near';
      if (grouped[direction]) {
        grouped[direction].push(el);
      } else {
        grouped.near.push(el);
      }
    });
    
    return grouped;
  }

  private buildRelationshipsDescription(groupedElements: { [key: string]: any[] }): string {
    const relationships: string[] = [];
    
    Object.entries(groupedElements).forEach(([direction, elements]) => {
      if (elements.length > 0) {
        const count = elements.length;
        const interactiveCount = elements.filter(el => el.isInteractive).length;
        relationships.push(`${direction}: ${count} elements (${interactiveCount} interactive)`);
      }
    });
    
    return relationships.join(', ') || 'no clear relationships';
  }
}