import OpenAI from 'openai';
import { Logger } from './Logger.js';
import { ClickContext } from '../models/HybridTrainingExample.js';

export interface VisionAnalysisResult {
  userReasoning: string;
  visualCues: string[];
  alternativesConsidered: string[];
  confidenceLevel: number;
  clickContext: ClickContext;
  strategicValue: number; // How good was this click for achieving the goal
  userExperienceRating: number; // How obvious/easy was this click
}

export interface ScreenshotAnalysisInput {
  beforeScreenshot: Buffer;
  afterScreenshot: Buffer;
  annotatedScreenshot?: Buffer;
  query: string;
  site: string;
  clickCoordinates: { x: number; y: number };
  elementInfo: any;
}

export class VisionAnalyzer {
  private openai: OpenAI;
  private logger: Logger;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });

    this.logger = new Logger('VisionAnalyzer');
  }

  async analyzeClickWithContext(input: ScreenshotAnalysisInput): Promise<VisionAnalysisResult> {
    const { beforeScreenshot, afterScreenshot, query, site, clickCoordinates, elementInfo } = input;

    try {
      const analysis = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `SHOPPING ANALYSIS TASK:
                     
                     Site: ${site}
                     User Goal: "${query}"
                     Action: Clicked at coordinates (${clickCoordinates.x}, ${clickCoordinates.y})
                     Element: ${elementInfo.tagName} with text "${elementInfo.text}"

                     Analyze these before/after screenshots as an expert in user experience and e-commerce psychology.

                     For the BEFORE screenshot, identify:
                     1. What element was clicked and why it's visually obvious to a shopper
                     2. What visual hierarchy/design makes this element stand out
                     3. What alternative elements were visible but NOT chosen (and why)
                     4. How this relates to common shopping behaviors and patterns
                     5. Rate visual clarity (1-10): How obvious was this choice?

                     For the AFTER screenshot, analyze:
                     1. How the click advanced toward the shopping goal
                     2. Whether the page change met user expectations
                     3. Quality of the navigation choice (strategic value 1-10)
                     4. What shopping strategy this represents (browse vs search, etc.)

                     Respond in this exact JSON format:
                     {
                       "userReasoning": "Why a human shopper would click this element",
                       "visualCues": ["specific design elements that guided the click"],
                       "alternativesConsidered": ["other visible options that weren't chosen"],
                       "confidenceLevel": 8.5,
                       "strategicValue": 9.0,
                       "userExperienceRating": 8.0,
                       "shoppingPattern": "category_browse" | "search_first" | "filter_focused" | "brand_hunting",
                       "visualHierarchy": "description of design hierarchy",
                       "progressAssessment": "how well this advanced toward the goal"
                     }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${beforeScreenshot.toString('base64')}`
              }
            },
            {
              type: "text",
              text: "AFTER CLICK RESULT:"
            },
            {
              type: "image_url", 
              image_url: {
                url: `data:image/png;base64,${afterScreenshot.toString('base64')}`
              }
            }
          ]
        }],
        temperature: 0.1 // Low temperature for consistent analysis
      });

      const response = analysis.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from vision analysis');
      }

      return this.parseVisionResponse(response, elementInfo, clickCoordinates);

    } catch (error) {
      this.logger.error('Vision analysis failed', error as Error);
      return this.generateFallbackAnalysis(elementInfo, clickCoordinates);
    }
  }

  private parseVisionResponse(response: string, elementInfo: any, clickCoordinates: { x: number; y: number }): VisionAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in vision response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        userReasoning: parsed.userReasoning || 'Vision analysis unavailable',
        visualCues: Array.isArray(parsed.visualCues) ? parsed.visualCues : [],
        alternativesConsidered: Array.isArray(parsed.alternativesConsidered) ? parsed.alternativesConsidered : [],
        confidenceLevel: this.validateNumber(parsed.confidenceLevel, 5.0),
        strategicValue: this.validateNumber(parsed.strategicValue, 5.0),
        userExperienceRating: this.validateNumber(parsed.userExperienceRating, 5.0),
        clickContext: this.extractClickContext(elementInfo, clickCoordinates, parsed)
      };

    } catch (error) {
      this.logger.warn('Failed to parse vision response, using fallback', error as Error);
      return this.generateFallbackAnalysis(elementInfo, clickCoordinates);
    }
  }

  private validateNumber(value: any, fallback: number): number {
    const num = parseFloat(value);
    return isNaN(num) ? fallback : Math.max(0, Math.min(10, num));
  }

  private extractClickContext(elementInfo: any, clickCoordinates: { x: number; y: number }, visionData: any): ClickContext {
    return {
      coordinates: clickCoordinates,
      elementBounds: {
        x: elementInfo.position?.x || 0,
        y: elementInfo.position?.y || 0,
        width: elementInfo.position?.width || 0,
        height: elementInfo.position?.height || 0
      },
      elementText: elementInfo.text || '',
      elementType: elementInfo.tagName || 'unknown',
      parentContext: elementInfo.parentContext?.join(' > ') || '',
      pageSection: this.determinePageSection(clickCoordinates),
      visualHierarchy: this.assessVisualHierarchy(visionData.visualHierarchy)
    };
  }

  private determinePageSection(coordinates: { x: number; y: number }): ClickContext['pageSection'] {
    // Simple heuristic based on viewport position
    if (coordinates.y < 100) return 'header';
    if (coordinates.y > 800) return 'footer';
    if (coordinates.x < 300) return 'sidebar';
    return 'main';
  }

  private assessVisualHierarchy(description: string): number {
    if (!description) return 5;
    
    // Simple keyword analysis to rate visual prominence
    const prominentKeywords = ['prominent', 'large', 'bold', 'primary', 'highlighted', 'standout'];
    const subtleKeywords = ['small', 'secondary', 'subtle', 'hidden', 'minor'];
    
    const prominentCount = prominentKeywords.filter(word => 
      description.toLowerCase().includes(word)
    ).length;
    
    const subtleCount = subtleKeywords.filter(word => 
      description.toLowerCase().includes(word)
    ).length;
    
    return Math.max(1, Math.min(5, 3 + prominentCount - subtleCount));
  }

  private generateFallbackAnalysis(elementInfo: any, clickCoordinates: { x: number; y: number }): VisionAnalysisResult {
    return {
      userReasoning: `Clicked ${elementInfo.tagName} element with text "${elementInfo.text}"`,
      visualCues: ['Element was clickable', 'Element had visible text'],
      alternativesConsidered: ['Other clickable elements on page'],
      confidenceLevel: 5.0,
      strategicValue: 5.0,
      userExperienceRating: 5.0,
      clickContext: this.extractClickContext(elementInfo, clickCoordinates, {})
    };
  }

  async analyzeProductExtractionLayout(screenshot: Buffer, site: string, query: string): Promise<{
    layoutType: 'grid' | 'list' | 'carousel' | 'mixed';
    visualPatterns: string[];
    extractionStrategy: string;
    qualityIndicators: string[];
  }> {
    try {
      const analysis = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `PRODUCT LAYOUT ANALYSIS:
                     
                     Site: ${site}
                     Search Query: "${query}"
                     
                     Analyze this product listing page and identify:
                     
                     1. Layout type: grid, list, carousel, or mixed
                     2. Visual patterns that repeat for each product
                     3. How a human would naturally scan and identify products
                     4. Quality indicators (ratings, badges, etc.) that humans notice
                     5. Data extraction strategy based on visual layout
                     
                     Respond in JSON format:
                     {
                       "layoutType": "grid",
                       "visualPatterns": ["product cards", "price positioning", "image layout"],
                       "extractionStrategy": "how to systematically extract data",
                       "qualityIndicators": ["visual cues for data quality"],
                       "scanPattern": "how humans typically read this layout",
                       "productCount": estimated_number_of_products_visible
                     }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${screenshot.toString('base64')}`
              }
            }
          ]
        }],
        temperature: 0.2
      });

      const response = analysis.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from layout analysis');
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in layout response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        layoutType: parsed.layoutType || 'grid',
        visualPatterns: Array.isArray(parsed.visualPatterns) ? parsed.visualPatterns : [],
        extractionStrategy: parsed.extractionStrategy || 'Extract products systematically',
        qualityIndicators: Array.isArray(parsed.qualityIndicators) ? parsed.qualityIndicators : []
      };

    } catch (error) {
      this.logger.error('Layout analysis failed', error as Error);
      return {
        layoutType: 'grid',
        visualPatterns: ['Product cards', 'Price display', 'Product images'],
        extractionStrategy: 'Extract products using consistent selectors',
        qualityIndicators: ['Complete product information', 'Clear pricing', 'High-quality images']
      };
    }
  }

  async validateExtractedDataAgainstScreenshot(
    screenshot: Buffer,
    extractedData: any[],
    site: string
  ): Promise<{
    accuracy: number;
    completeness: number;
    visualValidation: boolean;
    discrepancies: string[];
  }> {
    try {
      const sampleData = extractedData.slice(0, 5); // Analyze first 5 products
      
      const validation = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `DATA VALIDATION TASK:
                     
                     Compare the extracted product data with what's visible in this screenshot.
                     
                     Extracted Data:
                     ${JSON.stringify(sampleData, null, 2)}
                     
                     Analyze:
                     1. Does the extracted data match what you see visually?
                     2. Are prices, titles, and other data accurate?
                     3. Is anything missing that should have been extracted?
                     4. Are there any obvious discrepancies?
                     
                     Respond in JSON:
                     {
                       "accuracy": 0.95,
                       "completeness": 0.90,
                       "visualValidation": true,
                       "discrepancies": ["list of any issues found"],
                       "dataQuality": "assessment of overall data quality"
                     }`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${screenshot.toString('base64')}`
              }
            }
          ]
        }],
        temperature: 0.1
      });

      const response = validation.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from validation');
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in validation response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        accuracy: this.validateNumber(parsed.accuracy, 0.8),
        completeness: this.validateNumber(parsed.completeness, 0.8),
        visualValidation: parsed.visualValidation !== false,
        discrepancies: Array.isArray(parsed.discrepancies) ? parsed.discrepancies : []
      };

    } catch (error) {
      this.logger.error('Data validation failed', error as Error);
      return {
        accuracy: 0.8,
        completeness: 0.8,
        visualValidation: false,
        discrepancies: ['Validation could not be completed']
      };
    }
  }

  async batchAnalyzeNavigationFlow(
    screenshots: Buffer[],
    query: string,
    site: string
  ): Promise<{
    overallStrategy: string;
    flowQuality: number;
    improvements: string[];
    userExperience: 'smooth' | 'difficult' | 'confusing';
  }> {
    try {
      // Limit to first and last few screenshots to avoid token limits
      const keyScreenshots = [
        screenshots[0],
        screenshots[Math.floor(screenshots.length / 2)],
        screenshots[screenshots.length - 1]
      ].filter(Boolean);

      const analysis = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `NAVIGATION FLOW ANALYSIS:
                     
                     Site: ${site}
                     Goal: "${query}"
                     
                     Analyze this navigation sequence (start -> middle -> end) and assess:
                     1. Overall navigation strategy used
                     2. Flow quality and efficiency (1-10)
                     3. User experience rating
                     4. Suggested improvements
                     
                     JSON response:
                     {
                       "overallStrategy": "category_browse | search_first | mixed",
                       "flowQuality": 8.5,
                       "userExperience": "smooth",
                       "improvements": ["suggestions for better navigation"]
                     }`
            },
            ...keyScreenshots.map((screenshot, index) => ({
              type: "image_url" as const,
              image_url: {
                url: `data:image/png;base64,${screenshot.toString('base64')}`
              }
            }))
          ]
        }],
        temperature: 0.2
      });

      const response = analysis.choices[0]?.message?.content;
      const parsed = response ? JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}') : {};

      return {
        overallStrategy: parsed.overallStrategy || 'mixed',
        flowQuality: this.validateNumber(parsed.flowQuality, 7.0),
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        userExperience: ['smooth', 'difficult', 'confusing'].includes(parsed.userExperience) 
          ? parsed.userExperience : 'smooth'
      };

    } catch (error) {
      this.logger.error('Flow analysis failed', error as Error);
      return {
        overallStrategy: 'mixed',
        flowQuality: 7.0,
        improvements: ['Could not analyze navigation flow'],
        userExperience: 'smooth'
      };
    }
  }
}