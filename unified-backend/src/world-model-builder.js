/**
 * WorldModelBuilder - Creates reusable site patterns and semantic mappings
 * Phase 3: World Model Construction and Pattern Recognition
 */

class WorldModelBuilder {
  constructor(sessionAnalyzer, journeyReconstructor) {
    this.sessionAnalyzer = sessionAnalyzer;
    this.journeyReconstructor = journeyReconstructor;
    this.patternThresholds = {
      minOccurrences: 2, // Pattern must appear at least twice
      minConfidence: 0.6, // Minimum confidence for pattern inclusion
      maxPatterns: 50, // Maximum patterns per category
      similarityThreshold: 0.8 // Threshold for grouping similar patterns
    };
  }

  /**
   * Build comprehensive world model from multiple sessions
   */
  async buildWorldModel(sessionAnalyses, journeyData, siteDomain) {
    const worldModel = {
      siteDomain,
      version: '1.0',
      createdAt: new Date().toISOString(),
      
      // Core site structure
      siteArchitecture: await this.analyzeSiteArchitecture(sessionAnalyses),
      
      // Page type patterns and layouts
      pageTypePatterns: await this.extractPageTypePatterns(sessionAnalyses),
      
      // Reusable component patterns
      componentPatterns: await this.identifyComponentPatterns(sessionAnalyses),
      
      // Navigation flows and user paths
      navigationPatterns: await this.extractNavigationPatterns(journeyData),
      
      // Interaction patterns and selectors
      interactionPatterns: await this.buildInteractionPatterns(sessionAnalyses, journeyData),
      
      // Business logic and conversion flows
      businessPatterns: await this.extractBusinessPatterns(journeyData),
      
      // Quality and reliability metrics
      modelQuality: await this.calculateModelQuality(sessionAnalyses, journeyData),
      
      // Usage statistics
      usageStats: this.generateUsageStatistics(sessionAnalyses, journeyData)
    };

    // Validate and optimize the model
    worldModel.validation = await this.validateWorldModel(worldModel);
    
    return worldModel;
  }

  /**
   * Analyze overall site architecture patterns
   */
  async analyzeSiteArchitecture(sessionAnalyses) {
    const architecture = {
      domainInfo: this.extractDomainInfo(sessionAnalyses),
      urlStructure: this.analyzeUrlStructure(sessionAnalyses),
      pageHierarchy: this.buildPageHierarchy(sessionAnalyses),
      commonLayouts: this.identifyCommonLayouts(sessionAnalyses)
    };

    return architecture;
  }

  /**
   * Extract domain-specific information
   */
  extractDomainInfo(sessionAnalyses) {
    const urls = [];
    const pageTitles = [];

    sessionAnalyses.forEach(analysis => {
      analysis.navigationFlow?.forEach(step => {
        if (step.url) urls.push(step.url);
        if (step.pageTitle) pageTitles.push(step.pageTitle);
      });
    });

    if (urls.length === 0) return { domain: 'unknown', type: 'unknown' };

    const firstUrl = urls[0];
    let domain, siteType;

    try {
      const urlObj = new URL(firstUrl);
      domain = urlObj.hostname;
      
      // Infer site type from domain and content
      siteType = this.inferSiteType(domain, pageTitles);
    } catch (e) {
      domain = 'unknown';
      siteType = 'unknown';
    }

    return {
      domain,
      siteType,
      totalUrls: urls.length,
      uniqueUrls: new Set(urls).size,
      sampleUrls: [...new Set(urls)].slice(0, 5)
    };
  }

  /**
   * Infer site type from domain and content
   */
  inferSiteType(domain, pageTitles) {
    const allText = `${domain} ${pageTitles.join(' ')}`.toLowerCase();

    const siteTypePatterns = {
      'ecommerce': /shop|store|buy|cart|product|price|\$|checkout|purchase/,
      'saas': /app|software|service|platform|dashboard|account|subscription/,
      'content': /blog|news|article|read|story|post|content/,
      'corporate': /about|company|business|service|contact|enterprise/,
      'marketplace': /marketplace|seller|buyer|listing|vendor/
    };

    for (const [type, pattern] of Object.entries(siteTypePatterns)) {
      if (pattern.test(allText)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Analyze URL structure patterns
   */
  analyzeUrlStructure(sessionAnalyses) {
    const urlPatterns = new Map();
    const pathStructures = new Map();

    sessionAnalyses.forEach(analysis => {
      analysis.navigationFlow?.forEach(step => {
        if (!step.url) return;

        try {
          const url = new URL(step.url);
          const pathParts = url.pathname.split('/').filter(Boolean);
          
          // Track path depth
          const depth = pathParts.length;
          pathStructures.set(depth, (pathStructures.get(depth) || 0) + 1);
          
          // Track path patterns
          if (pathParts.length > 0) {
            const pattern = pathParts.map((part, index) => {
              // Generalize dynamic parts (IDs, etc.)
              if (/^\d+$/.test(part) || /^[a-f0-9-]{20,}$/i.test(part)) {
                return '{id}';
              }
              return part;
            }).join('/');
            
            urlPatterns.set(pattern, (urlPatterns.get(pattern) || 0) + 1);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });
    });

    // Get most common patterns
    const topPatterns = Array.from(urlPatterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const avgDepth = Array.from(pathStructures.entries())
      .reduce((sum, [depth, count]) => sum + (depth * count), 0) / 
      Array.from(pathStructures.values()).reduce((sum, count) => sum + count, 0);

    return {
      commonPatterns: topPatterns.map(([pattern, count]) => ({ pattern, count })),
      pathDepthDistribution: Object.fromEntries(pathStructures),
      averagePathDepth: Math.round(avgDepth * 10) / 10
    };
  }

  /**
   * Build page hierarchy and relationships
   */
  buildPageHierarchy(sessionAnalyses) {
    const hierarchy = new Map();
    const transitions = new Map();

    sessionAnalyses.forEach(analysis => {
      const flow = analysis.navigationFlow || [];
      
      // Build page type hierarchy
      flow.forEach(step => {
        if (!hierarchy.has(step.pageType)) {
          hierarchy.set(step.pageType, {
            count: 0,
            urls: new Set(),
            titles: new Set()
          });
        }
        
        const pageData = hierarchy.get(step.pageType);
        pageData.count++;
        if (step.url) pageData.urls.add(step.url);
        if (step.pageTitle) pageData.titles.add(step.pageTitle);
      });

      // Track page transitions
      for (let i = 1; i < flow.length; i++) {
        const from = flow[i - 1].pageType;
        const to = flow[i].pageType;
        const transitionKey = `${from}->${to}`;
        
        transitions.set(transitionKey, (transitions.get(transitionKey) || 0) + 1);
      }
    });

    // Convert to plain objects
    const pageTypes = {};
    for (const [pageType, data] of hierarchy) {
      pageTypes[pageType] = {
        count: data.count,
        uniqueUrls: data.urls.size,
        uniqueTitles: data.titles.size,
        sampleUrls: Array.from(data.urls).slice(0, 3),
        sampleTitles: Array.from(data.titles).slice(0, 3)
      };
    }

    const commonTransitions = Array.from(transitions.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([transition, count]) => ({ transition, count }));

    return {
      pageTypes,
      commonTransitions,
      totalTransitions: transitions.size
    };
  }

  /**
   * Identify common layout patterns
   */
  identifyCommonLayouts(sessionAnalyses) {
    const layoutPatterns = new Map();

    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        const zonePattern = zones
          .sort((a, b) => b.confidence - a.confidence)
          .map(zone => zone.name)
          .join('|');

        if (zonePattern) {
          layoutPatterns.set(zonePattern, (layoutPatterns.get(zonePattern) || 0) + 1);
        }
      }
    });

    const commonLayouts = Array.from(layoutPatterns.entries())
      .filter(([pattern, count]) => count >= this.patternThresholds.minOccurrences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({
        zones: pattern.split('|'),
        occurrences: count,
        confidence: Math.min(1.0, count / 10) // Normalize confidence
      }));

    return commonLayouts;
  }

  /**
   * Extract page type specific patterns
   */
  async extractPageTypePatterns(sessionAnalyses) {
    const pageTypePatterns = {};

    // Group analyses by page type
    const pageTypeGroups = new Map();
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.pageTypes) return;

      for (const [key, pageAnalysis] of analysis.pageTypes) {
        const pageType = pageAnalysis.pageType;
        
        if (!pageTypeGroups.has(pageType)) {
          pageTypeGroups.set(pageType, []);
        }
        
        pageTypeGroups.get(pageType).push(pageAnalysis);
      }
    });

    // Extract patterns for each page type
    for (const [pageType, analyses] of pageTypeGroups) {
      if (analyses.length < this.patternThresholds.minOccurrences) continue;

      pageTypePatterns[pageType] = {
        totalOccurrences: analyses.length,
        averageConfidence: analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length,
        
        // Common URL patterns
        urlPatterns: this.extractUrlPatterns(analyses),
        
        // Common DOM patterns
        domPatterns: this.extractDomPatterns(analyses),
        
        // Common zones
        commonZones: this.extractCommonZones(analyses),
        
        // Selector patterns
        selectorPatterns: this.extractSelectorPatterns(analyses)
      };
    }

    return pageTypePatterns;
  }

  /**
   * Extract URL patterns for a page type
   */
  extractUrlPatterns(analyses) {
    const urlMap = new Map();
    
    analyses.forEach(analysis => {
      if (analysis.url) {
        try {
          const url = new URL(analysis.url);
          const pathPattern = this.generalizePath(url.pathname);
          urlMap.set(pathPattern, (urlMap.get(pathPattern) || 0) + 1);
        } catch (e) {
          // Invalid URL
        }
      }
    });

    return Array.from(urlMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Generalize URL path by replacing dynamic segments
   */
  generalizePath(pathname) {
    return pathname
      .split('/')
      .map(segment => {
        // Replace IDs and UUIDs
        if (/^\d+$/.test(segment)) return '{id}';
        if (/^[a-f0-9-]{20,}$/i.test(segment)) return '{uuid}';
        if (/^[a-z0-9-]{10,}$/i.test(segment) && segment.includes('-')) return '{slug}';
        return segment;
      })
      .join('/');
  }

  /**
   * Extract DOM patterns
   */
  extractDomPatterns(analyses) {
    const patternMap = new Map();
    
    analyses.forEach(analysis => {
      if (analysis.matchedPatterns) {
        analysis.matchedPatterns.forEach(match => {
          if (match.type === 'dom') {
            patternMap.set(match.pattern, (patternMap.get(match.pattern) || 0) + 1);
          }
        });
      }
    });

    return Array.from(patternMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Extract common zones for page type
   */
  extractCommonZones(analyses) {
    const zoneMap = new Map();
    
    analyses.forEach(analysis => {
      if (analysis.zones) {
        analysis.zones.forEach(zone => {
          zoneMap.set(zone.name, (zoneMap.get(zone.name) || 0) + zone.confidence);
        });
      }
    });

    return Array.from(zoneMap.entries())
      .map(([zone, totalConfidence]) => ({
        zone,
        averageConfidence: totalConfidence / analyses.length,
        occurrences: analyses.filter(a => a.zones?.some(z => z.name === zone)).length
      }))
      .sort((a, b) => b.averageConfidence - a.averageConfidence)
      .slice(0, 5);
  }

  /**
   * Extract selector patterns
   */
  extractSelectorPatterns(analyses) {
    // This would be expanded based on selector data from interactions
    return [];
  }

  /**
   * Identify reusable component patterns
   */
  async identifyComponentPatterns(sessionAnalyses) {
    const componentPatterns = {
      navigation: this.identifyNavigationPatterns(sessionAnalyses),
      productCards: this.identifyProductCardPatterns(sessionAnalyses),
      forms: this.identifyFormPatterns(sessionAnalyses),
      buttons: this.identifyButtonPatterns(sessionAnalyses),
      filters: this.identifyFilterPatterns(sessionAnalyses)
    };

    return componentPatterns;
  }

  /**
   * Identify navigation component patterns
   */
  identifyNavigationPatterns(sessionAnalyses) {
    const navPatterns = [];
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        const navZones = zones.filter(zone => zone.name === 'navigation');
        
        navZones.forEach(navZone => {
          if (navZone.confidence > this.patternThresholds.minConfidence) {
            navPatterns.push({
              confidence: navZone.confidence,
              selectors: navZone.matchedSelectors || [],
              timestamp
            });
          }
        });
      }
    });

    // Group similar navigation patterns
    const groupedPatterns = this.groupSimilarPatterns(navPatterns);
    
    return groupedPatterns.map(group => ({
      type: 'navigation',
      occurrences: group.length,
      averageConfidence: group.reduce((sum, p) => sum + p.confidence, 0) / group.length,
      commonSelectors: this.findCommonSelectors(group),
      reliability: Math.min(1.0, group.length / 5)
    }));
  }

  /**
   * Identify product card patterns (for e-commerce sites)
   */
  identifyProductCardPatterns(sessionAnalyses) {
    const cardPatterns = [];
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        const productZones = zones.filter(zone => zone.name === 'productGrid');
        
        productZones.forEach(zone => {
          if (zone.confidence > this.patternThresholds.minConfidence) {
            cardPatterns.push({
              confidence: zone.confidence,
              selectors: zone.matchedSelectors || [],
              timestamp
            });
          }
        });
      }
    });

    const groupedPatterns = this.groupSimilarPatterns(cardPatterns);
    
    return groupedPatterns.map(group => ({
      type: 'productCard',
      occurrences: group.length,
      averageConfidence: group.reduce((sum, p) => sum + p.confidence, 0) / group.length,
      commonSelectors: this.findCommonSelectors(group),
      reliability: Math.min(1.0, group.length / 3)
    }));
  }

  /**
   * Identify form patterns
   */
  identifyFormPatterns(sessionAnalyses) {
    // Implementation would analyze form-related zones and interactions
    return [];
  }

  /**
   * Identify button patterns
   */
  identifyButtonPatterns(sessionAnalyses) {
    const buttonPatterns = [];
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        const actionZones = zones.filter(zone => zone.name === 'actionButtons');
        
        actionZones.forEach(zone => {
          if (zone.confidence > this.patternThresholds.minConfidence) {
            buttonPatterns.push({
              confidence: zone.confidence,
              selectors: zone.matchedSelectors || [],
              timestamp
            });
          }
        });
      }
    });

    const groupedPatterns = this.groupSimilarPatterns(buttonPatterns);
    
    return groupedPatterns.map(group => ({
      type: 'actionButton',
      occurrences: group.length,
      averageConfidence: group.reduce((sum, p) => sum + p.confidence, 0) / group.length,
      commonSelectors: this.findCommonSelectors(group),
      reliability: Math.min(1.0, group.length / 3)
    }));
  }

  /**
   * Identify filter patterns
   */
  identifyFilterPatterns(sessionAnalyses) {
    const filterPatterns = [];
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        const filterZones = zones.filter(zone => zone.name === 'filterSidebar');
        
        filterZones.forEach(zone => {
          if (zone.confidence > this.patternThresholds.minConfidence) {
            filterPatterns.push({
              confidence: zone.confidence,
              selectors: zone.matchedSelectors || [],
              timestamp
            });
          }
        });
      }
    });

    const groupedPatterns = this.groupSimilarPatterns(filterPatterns);
    
    return groupedPatterns.map(group => ({
      type: 'filterSidebar',
      occurrences: group.length,
      averageConfidence: group.reduce((sum, p) => sum + p.confidence, 0) / group.length,
      commonSelectors: this.findCommonSelectors(group),
      reliability: Math.min(1.0, group.length / 3)
    }));
  }

  /**
   * Group similar patterns together
   */
  groupSimilarPatterns(patterns) {
    if (patterns.length === 0) return [];

    const groups = [];
    const used = new Set();

    patterns.forEach((pattern, index) => {
      if (used.has(index)) return;

      const group = [pattern];
      used.add(index);

      // Find similar patterns
      patterns.forEach((otherPattern, otherIndex) => {
        if (used.has(otherIndex) || index === otherIndex) return;

        const similarity = this.calculatePatternSimilarity(pattern, otherPattern);
        if (similarity > this.patternThresholds.similarityThreshold) {
          group.push(otherPattern);
          used.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  /**
   * Calculate similarity between two patterns
   */
  calculatePatternSimilarity(pattern1, pattern2) {
    // Simple similarity based on selector overlap
    const selectors1 = new Set(pattern1.selectors || []);
    const selectors2 = new Set(pattern2.selectors || []);
    
    const intersection = new Set([...selectors1].filter(x => selectors2.has(x)));
    const union = new Set([...selectors1, ...selectors2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Find common selectors across pattern group
   */
  findCommonSelectors(patternGroup) {
    if (patternGroup.length === 0) return [];

    const selectorCounts = new Map();
    
    patternGroup.forEach(pattern => {
      (pattern.selectors || []).forEach(selector => {
        selectorCounts.set(selector, (selectorCounts.get(selector) || 0) + 1);
      });
    });

    const threshold = Math.ceil(patternGroup.length * 0.5); // 50% threshold
    
    return Array.from(selectorCounts.entries())
      .filter(([selector, count]) => count >= threshold)
      .sort(([,a], [,b]) => b - a)
      .map(([selector, count]) => ({ selector, occurrences: count }));
  }

  /**
   * Extract navigation patterns from journey data
   */
  async extractNavigationPatterns(journeyData) {
    const navigationPatterns = {
      commonFlows: this.identifyCommonFlows(journeyData),
      entryPoints: this.identifyEntryPoints(journeyData),
      exitPoints: this.identifyExitPoints(journeyData),
      conversionPaths: this.identifyConversionPaths(journeyData)
    };

    return navigationPatterns;
  }

  /**
   * Identify common user flows
   */
  identifyCommonFlows(journeyData) {
    const flowPatterns = new Map();
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        const pageSequence = journey.pageTypeSequence?.join(' → ') || '';
        if (pageSequence) {
          flowPatterns.set(pageSequence, (flowPatterns.get(pageSequence) || 0) + 1);
        }
      });
    });

    return Array.from(flowPatterns.entries())
      .filter(([flow, count]) => count >= this.patternThresholds.minOccurrences)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([flow, count]) => ({
        flow,
        occurrences: count,
        steps: flow.split(' → '),
        confidence: Math.min(1.0, count / 5)
      }));
  }

  /**
   * Identify common entry points
   */
  identifyEntryPoints(journeyData) {
    const entryPoints = new Map();
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        const firstStep = journey.navigationFlow?.[0];
        if (firstStep) {
          const entryKey = `${firstStep.pageType} | ${firstStep.url}`;
          entryPoints.set(entryKey, (entryPoints.get(entryKey) || 0) + 1);
        }
      });
    });

    return Array.from(entryPoints.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([entry, count]) => {
        const [pageType, url] = entry.split(' | ');
        return { pageType, url, occurrences: count };
      });
  }

  /**
   * Identify common exit points
   */
  identifyExitPoints(journeyData) {
    const exitPoints = new Map();
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        const lastStep = journey.navigationFlow?.[journey.navigationFlow.length - 1];
        if (lastStep) {
          const exitKey = `${lastStep.pageType} | ${lastStep.url}`;
          exitPoints.set(exitKey, (exitPoints.get(exitKey) || 0) + 1);
        }
      });
    });

    return Array.from(exitPoints.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([exit, count]) => {
        const [pageType, url] = exit.split(' | ');
        return { pageType, url, occurrences: count };
      });
  }

  /**
   * Identify conversion paths
   */
  identifyConversionPaths(journeyData) {
    const conversionPaths = [];
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        if (journey.conversionPoints && journey.conversionPoints.length > 0) {
          conversionPaths.push({
            journeyType: journey.journeyType,
            stepCount: journey.stepCount,
            conversionType: journey.conversionPoints[0].type,
            pageSequence: journey.pageTypeSequence,
            duration: journey.duration
          });
        }
      });
    });

    // Group by conversion type
    const groupedPaths = conversionPaths.reduce((acc, path) => {
      const key = path.conversionType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(path);
      return acc;
    }, {});

    // Analyze each conversion type
    const conversionAnalysis = {};
    for (const [conversionType, paths] of Object.entries(groupedPaths)) {
      conversionAnalysis[conversionType] = {
        totalOccurrences: paths.length,
        averageSteps: paths.reduce((sum, p) => sum + p.stepCount, 0) / paths.length,
        averageDuration: paths.reduce((sum, p) => sum + p.duration, 0) / paths.length,
        commonJourneyTypes: [...new Set(paths.map(p => p.journeyType))]
      };
    }

    return conversionAnalysis;
  }

  /**
   * Build interaction patterns and selectors
   */
  async buildInteractionPatterns(sessionAnalyses, journeyData) {
    const interactionPatterns = {
      selectorPatterns: this.extractSelectorPatterns(sessionAnalyses),
      interactionSequences: this.extractInteractionSequences(journeyData),
      elementPatterns: this.extractElementPatterns(sessionAnalyses),
      reliabilityScores: this.calculateSelectorReliability(sessionAnalyses)
    };

    return interactionPatterns;
  }

  /**
   * Extract business patterns and conversion logic
   */
  async extractBusinessPatterns(journeyData) {
    const businessPatterns = {
      conversionFunnels: this.analyzeConversionFunnels(journeyData),
      userBehaviorSegments: this.identifyUserBehaviorSegments(journeyData),
      dropoffAnalysis: this.analyzeDropoffPatterns(journeyData),
      performanceMetrics: this.calculateBusinessMetrics(journeyData)
    };

    return businessPatterns;
  }

  /**
   * Analyze conversion funnels
   */
  analyzeConversionFunnels(journeyData) {
    const funnels = {};
    
    journeyData.forEach(data => {
      if (!data.userIntentAnalysis?.conversionFunnels) return;

      data.userIntentAnalysis.conversionFunnels.forEach(funnel => {
        if (!funnels[funnel.type]) {
          funnels[funnel.type] = {
            totalJourneys: 0,
            totalSteps: 0,
            conversionRate: 0
          };
        }

        const f = funnels[funnel.type];
        f.totalJourneys += funnel.journeyCount;
        f.totalSteps += funnel.averageSteps * funnel.journeyCount;
        f.conversionRate += funnel.conversionRate * funnel.journeyCount;
      });
    });

    // Calculate averages
    for (const funnel of Object.values(funnels)) {
      if (funnel.totalJourneys > 0) {
        funnel.averageSteps = funnel.totalSteps / funnel.totalJourneys;
        funnel.averageConversionRate = funnel.conversionRate / funnel.totalJourneys;
      }
    }

    return funnels;
  }

  /**
   * Identify user behavior segments
   */
  identifyUserBehaviorSegments(journeyData) {
    const segments = new Map();
    
    journeyData.forEach(data => {
      if (!data.userIntentAnalysis?.userBehaviorPatterns) return;

      data.userIntentAnalysis.userBehaviorPatterns.forEach(pattern => {
        segments.set(pattern.type, (segments.get(pattern.type) || 0) + 1);
      });
    });

    return Array.from(segments.entries()).map(([type, count]) => ({ type, count }));
  }

  /**
   * Analyze dropoff patterns
   */
  analyzeDropoffPatterns(journeyData) {
    const dropoffPoints = new Map();
    
    journeyData.forEach(data => {
      if (!data.userIntentAnalysis?.dropoffPoints) return;

      data.userIntentAnalysis.dropoffPoints.forEach(dropoff => {
        const key = dropoff.pageType;
        const existing = dropoffPoints.get(key) || { totalDropoffs: 0, sessions: 0 };
        existing.totalDropoffs += dropoff.dropoffCount;
        existing.sessions += 1;
        dropoffPoints.set(key, existing);
      });
    });

    return Array.from(dropoffPoints.entries()).map(([pageType, data]) => ({
      pageType,
      averageDropoffs: data.totalDropoffs / data.sessions,
      affectedSessions: data.sessions
    }));
  }

  /**
   * Calculate business performance metrics
   */
  calculateBusinessMetrics(journeyData) {
    let totalJourneys = 0;
    let completedJourneys = 0;
    let totalDuration = 0;
    let totalSteps = 0;

    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        totalJourneys++;
        totalDuration += journey.duration || 0;
        totalSteps += journey.stepCount || 0;
        
        if (journey.conversionPoints && journey.conversionPoints.length > 0) {
          completedJourneys++;
        }
      });
    });

    return {
      totalJourneys,
      completionRate: totalJourneys > 0 ? completedJourneys / totalJourneys : 0,
      averageDuration: totalJourneys > 0 ? totalDuration / totalJourneys : 0,
      averageSteps: totalJourneys > 0 ? totalSteps / totalJourneys : 0,
      efficiency: totalSteps > 0 ? completedJourneys / totalSteps : 0
    };
  }

  /**
   * Calculate model quality metrics
   */
  async calculateModelQuality(sessionAnalyses, journeyData) {
    const quality = {
      patternCoverage: this.calculatePatternCoverage(sessionAnalyses),
      patternReliability: this.calculatePatternReliability(sessionAnalyses),
      journeyCompleteness: this.calculateJourneyCompleteness(journeyData),
      modelConfidence: 0
    };

    quality.modelConfidence = (
      quality.patternCoverage + 
      quality.patternReliability + 
      quality.journeyCompleteness
    ) / 3;

    return quality;
  }

  /**
   * Calculate pattern coverage across sessions
   */
  calculatePatternCoverage(sessionAnalyses) {
    let totalPages = 0;
    let coveredPages = 0;

    sessionAnalyses.forEach(analysis => {
      if (analysis.pageTypes) {
        for (const [key, pageAnalysis] of analysis.pageTypes) {
          totalPages++;
          if (pageAnalysis.confidence > this.patternThresholds.minConfidence) {
            coveredPages++;
          }
        }
      }
    });

    return totalPages > 0 ? coveredPages / totalPages : 0;
  }

  /**
   * Calculate pattern reliability
   */
  calculatePatternReliability(sessionAnalyses) {
    const confidenceScores = [];

    sessionAnalyses.forEach(analysis => {
      if (analysis.quality) {
        confidenceScores.push(analysis.quality.reliability);
      }
    });

    return confidenceScores.length > 0 ? 
      confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length : 0;
  }

  /**
   * Calculate journey completeness
   */
  calculateJourneyCompleteness(journeyData) {
    let totalJourneys = 0;
    let completeJourneys = 0;

    journeyData.forEach(data => {
      if (data.qualityMetrics) {
        totalJourneys += data.journeyCount || 0;
        completeJourneys += (data.qualityMetrics.completeness || 0) * (data.journeyCount || 0);
      }
    });

    return totalJourneys > 0 ? completeJourneys / totalJourneys : 0;
  }

  /**
   * Generate usage statistics
   */
  generateUsageStatistics(sessionAnalyses, journeyData) {
    return {
      totalSessions: sessionAnalyses.length,
      totalJourneys: journeyData.reduce((sum, data) => sum + (data.journeyCount || 0), 0),
      totalPages: sessionAnalyses.reduce((sum, analysis) => sum + (analysis.pageTypes?.size || 0), 0),
      averageSessionQuality: sessionAnalyses.reduce((sum, analysis) => 
        sum + (analysis.quality?.analysisConfidence || 0), 0) / sessionAnalyses.length,
      generationDate: new Date().toISOString()
    };
  }

  /**
   * Validate world model completeness and accuracy
   */
  async validateWorldModel(worldModel) {
    const validation = {
      completenessScore: 0,
      accuracyScore: 0,
      consistencyScore: 0,
      usabilityScore: 0,
      overallScore: 0,
      issues: [],
      recommendations: []
    };

    // Check completeness
    validation.completenessScore = this.validateCompleteness(worldModel);
    
    // Check accuracy
    validation.accuracyScore = this.validateAccuracy(worldModel);
    
    // Check consistency
    validation.consistencyScore = this.validateConsistency(worldModel);
    
    // Check usability
    validation.usabilityScore = this.validateUsability(worldModel);

    validation.overallScore = (
      validation.completenessScore +
      validation.accuracyScore +
      validation.consistencyScore +
      validation.usabilityScore
    ) / 4;

    // Add recommendations
    if (validation.completenessScore < 0.8) {
      validation.recommendations.push('Increase pattern coverage by analyzing more sessions');
    }
    
    if (validation.accuracyScore < 0.7) {
      validation.recommendations.push('Improve pattern accuracy thresholds');
    }

    return validation;
  }

  /**
   * Validate model completeness
   */
  validateCompleteness(worldModel) {
    let score = 0;
    let maxScore = 0;

    // Required components
    const requiredComponents = [
      'siteArchitecture', 'pageTypePatterns', 'componentPatterns',
      'navigationPatterns', 'interactionPatterns', 'businessPatterns'
    ];

    requiredComponents.forEach(component => {
      maxScore += 1;
      if (worldModel[component] && Object.keys(worldModel[component]).length > 0) {
        score += 1;
      }
    });

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Validate model accuracy
   */
  validateAccuracy(worldModel) {
    return worldModel.modelQuality?.modelConfidence || 0;
  }

  /**
   * Validate model consistency
   */
  validateConsistency(worldModel) {
    // Check for consistent patterns across components
    let consistencyScore = 0.8; // Base score
    
    // Add consistency checks here
    
    return consistencyScore;
  }

  /**
   * Validate model usability
   */
  validateUsability(worldModel) {
    let usabilityScore = 0;
    
    // Check if patterns have sufficient detail for reuse
    const hasDetailedPatterns = worldModel.componentPatterns &&
      Object.values(worldModel.componentPatterns).some(patterns => 
        patterns.length > 0 && patterns[0].commonSelectors?.length > 0);
    
    if (hasDetailedPatterns) usabilityScore += 0.5;
    
    // Check if navigation patterns are actionable
    const hasActionableNavigation = worldModel.navigationPatterns?.commonFlows?.length > 0;
    if (hasActionableNavigation) usabilityScore += 0.5;

    return usabilityScore;
  }

  // Placeholder methods for pattern extraction
  extractSelectorPatterns(sessionAnalyses) { return []; }
  extractInteractionSequences(journeyData) { return []; }
  extractElementPatterns(sessionAnalyses) { return []; }
  calculateSelectorReliability(sessionAnalyses) { return {}; }
}

module.exports = WorldModelBuilder;