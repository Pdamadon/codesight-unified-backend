import { PrismaClient, TaskType, TaskDifficulty, TaskAvailability, TaskAssignmentStatus } from '@prisma/client';
import { Logger } from '../utils/logger';
import { OpenAITaskService } from './openai-task-service';

export interface GeneratedTask {
  id: string;
  type: TaskType;
  difficulty: TaskDifficulty;
  title: string;
  description: string;
  steps: string[];
  website: string;
  category: string;
  estimatedTime: number;
  successCriteria: string[];
  tags: string[];
  context: {
    targetElements?: string[];
    expectedPages?: string[];
    alternativeApproaches?: string[];
  };
}

export interface TaskAssignment {
  taskId: string;
  sessionId: string;
  userId: string;
  assignedAt: Date;
  status: TaskAssignmentStatus;
  completionTime?: number;
  automationSequence?: any[];
  outcomeAnalysis?: any;
}

export class TaskGenerationService {
  private prisma: PrismaClient;
  private logger: Logger;
  private openaiTaskService: OpenAITaskService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.logger = new Logger('TaskGenerationService');
    this.openaiTaskService = new OpenAITaskService();
  }

  // Generate contextual task using OpenAI based on website and user level
  async generateTask(website: string, userLevel: string = 'beginner', category?: string): Promise<GeneratedTask> {
    // Analyze site capabilities outside try block so it's available for fallback
    const siteContext = await this.analyzeSiteCapabilities(website);
    
    try {
      this.logger.info('🚀 STARTING AI-powered task generation', { website, userLevel, category, timestamp: Date.now() });

      const task = await this.generateTaskWithOpenAI(website, siteContext, userLevel, category);
      
      this.logger.info('✅ AI task generation SUCCESS', { taskId: task.id, title: task.title });
      
      // Store task in database for tracking
      await this.storeTask(task);
      
      return task;
    } catch (error) {
      this.logger.error('❌ AI task generation FAILED - falling back to templates', { 
        website, 
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'UnknownError'
      });
      // Fallback to template-based generation if OpenAI fails
      const fallbackTask = await this.createContextualTask(website, siteContext, userLevel, category);
      await this.storeTask(fallbackTask);
      this.logger.info('📝 Using template fallback task', { taskId: fallbackTask.id, title: fallbackTask.title });
      return fallbackTask;
    }
  }

  // Generate task using OpenAI with contextual prompts
  private async generateTaskWithOpenAI(website: string, siteContext: any, userLevel: string, category?: string): Promise<GeneratedTask> {
    const hostname = new URL(website).hostname;
    
    this.logger.info('Building OpenAI task generation prompt', { hostname, userLevel, category });
    
    const prompt = this.buildTaskGenerationPrompt(hostname, siteContext, userLevel, category);
    
    this.logger.info('Calling OpenAI service for task generation', { promptLength: prompt.length });
    
    // Call OpenAI to generate the task
    const openAIResponse = await this.openaiTaskService.generateTask(prompt);
    
    this.logger.info('OpenAI response received', { responseLength: openAIResponse.length });
    
    // Parse and structure the response
    return this.parseOpenAITaskResponse(openAIResponse, website, userLevel);
  }

  // Analyze website capabilities to generate appropriate tasks
  private async analyzeSiteCapabilities(website: string): Promise<any> {
    const hostname = new URL(website).hostname.toLowerCase();
    
    // Website-specific task templates
    const siteCapabilities = {
      'amazon.com': {
        categories: ['shopping', 'comparison', 'wishlist', 'reviews'],
        features: ['search', 'filter', 'cart', 'checkout', 'reviews', 'recommendations'],
        complexity: ['product_search', 'price_comparison', 'bulk_ordering', 'subscription_management']
      },
      'nike.com': {
        categories: ['athletic', 'apparel', 'customization', 'sizing'],
        features: ['product_customization', 'size_guide', 'style_matching', 'sport_specific'],
        complexity: ['outfit_building', 'performance_matching', 'custom_design']
      },
      'uniqlo.com': {
        categories: ['basics', 'seasonal', 'coordination', 'sizing'],
        features: ['color_matching', 'size_selection', 'outfit_coordination', 'seasonal_collections'],
        complexity: ['wardrobe_building', 'style_coordination', 'seasonal_planning']
      },
      'nordstrom.com': {
        categories: ['luxury', 'designer', 'personal_styling', 'occasion'],
        features: ['brand_comparison', 'style_advice', 'size_consultation', 'occasion_matching'],
        complexity: ['complete_outfit', 'brand_mixing', 'occasion_planning']
      }
    };

    // Seattle-specific site capabilities
    const seattleSpecificSites = {
      'rei.com': {
        categories: ['outdoor', 'hiking', 'seattle_weather', 'pacific_northwest'],
        features: ['gear_finder', 'local_store_pickup', 'expert_advice', 'outdoor_classes'],
        complexity: ['gear_selection', 'size_fitting', 'activity_matching'],
        localContext: 'Seattle flagship store available for pickup and returns'
      },
      'nordstrom.com': {
        categories: ['fashion', 'seattle_style', 'business_casual', 'rain_appropriate'],
        features: ['personal_styling', 'size_consultation', 'seattle_store_pickup'],
        complexity: ['style_coordination', 'occasion_dressing', 'seattle_weather_appropriate'],
        localContext: 'Founded in Seattle, local store network for services'
      },
      'starbucks.com': {
        categories: ['coffee', 'seattle_culture', 'local_roasters', 'gift_cards'],
        features: ['store_locator', 'mobile_order', 'rewards_program'],
        complexity: ['drink_customization', 'seasonal_offerings', 'local_store_features'],
        localContext: 'Seattle headquarters, original Pike Place location nearby'
      }
    };

    // Check for Seattle-specific sites first, then general
    return (seattleSpecificSites as any)[hostname] || (siteCapabilities as any)[hostname] || {
      categories: ['general', 'shopping', 'navigation'],
      features: ['browse', 'search', 'interact'],
      complexity: ['basic_navigation', 'simple_interaction']
    };
  }

  // Create specific task based on context
  private async createContextualTask(
    website: string, 
    siteContext: any, 
    userLevel: string, 
    preferredCategory?: string
  ): Promise<GeneratedTask> {
    const hostname = new URL(website).hostname;
    
    // Select task type based on user level
    const taskTypes = {
      'beginner': ['simple'],
      'intermediate': ['simple', 'comparison'],
      'advanced': ['comparison', 'complex', 'workflow']
    };
    
    const availableTypes = (taskTypes as any)[userLevel] || ['simple'];
    const taskType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Select category
    const category = preferredCategory || 
                    siteContext.categories[Math.floor(Math.random() * siteContext.categories.length)];
    
    // Generate task using templates
    const taskTemplate = await this.getTaskTemplate(hostname, taskType, category);
    const task = await this.populateTask(taskTemplate, website, siteContext);
    
    return task;
  }

  // Get task template based on site, type, and category
  private async getTaskTemplate(hostname: string, taskType: string, category: string): Promise<any> {
    // Task templates organized by site and complexity
    const templates = {
      'amazon.com': {
        simple: {
          shopping: [
            {
              title: "Find a specific product",
              description: "Search for and locate a {product} under ${price}",
              steps: ["Navigate to Amazon", "Search for {product}", "Filter by price", "Select a product"],
              successCriteria: ["Product found", "Price within budget", "Product page viewed"]
            },
            {
              title: "Add item to cart",
              description: "Find a {product} and add it to your cart",
              steps: ["Search for {product}", "Select product", "Add to cart"],
              successCriteria: ["Item added to cart", "Cart icon shows item count"]
            },
            {
              title: "Navigate to cart page",
              description: "Go to your shopping cart to review items",
              steps: ["Click cart icon", "View cart contents"],
              successCriteria: ["Cart page displayed", "Items visible in cart"]
            }
          ],
          comparison: [
            {
              title: "Compare similar products",
              description: "Compare 3 different {products} and choose the best value",
              steps: ["Search {products}", "Open 3 products in tabs", "Compare features", "Select best option"],
              successCriteria: ["3 products compared", "Decision made", "Best value identified"]
            }
          ]
        },
        complex: {
          shopping: [
            {
              title: "Build complete setup",
              description: "Create a {category} setup with all necessary components under ${budget}",
              steps: ["Research components", "Compare options", "Check compatibility", "Add all to cart"],
              successCriteria: ["Complete setup", "Within budget", "Components compatible"]
            }
          ]
        }
      },
      'nike.com': {
        simple: {
          athletic: [
            {
              title: "Find sport-specific gear",
              description: "Find {sport} {gear} in your size and preferred color",
              steps: ["Go to {sport} section", "Filter by {gear} type", "Select size", "Choose color"],
              successCriteria: ["Correct sport category", "Right size", "Preferred color"]
            }
          ]
        }
      },
      'uniqlo.com': {
        simple: {
          basics: [
            {
              title: "Build basic wardrobe",
              description: "Select {number} essential {clothing_type} in versatile colors",
              steps: ["Navigate to {clothing_type}", "Choose versatile colors", "Select sizes", "Add to cart"],
              successCriteria: ["Essential items selected", "Versatile colors", "Correct sizes"]
            }
          ]
        }
      },
      'rei.com': {
        simple: {
          outdoor: [
            {
              title: "Find Seattle weather gear",
              description: "Search for {gear} suitable for Seattle's rainy climate",
              steps: ["Browse outdoor gear", "Filter for weather protection", "Select Seattle-appropriate item"],
              successCriteria: ["Weather-resistant gear found", "Suitable for Pacific Northwest", "Added to cart"]
            },
            {
              title: "Gear up for local hiking",
              description: "Find {gear} for hiking trails around Seattle like Mount Rainier",
              steps: ["Visit hiking section", "Filter by activity", "Select trail-appropriate gear"],
              successCriteria: ["Hiking gear selected", "Appropriate for local trails", "Ready for checkout"]
            }
          ],
          seattle_weather: [
            {
              title: "Rain gear essentials",
              description: "Find a {product} to stay dry in Seattle weather",
              steps: ["Search rain gear", "Compare waterproof ratings", "Add to cart"],
              successCriteria: ["Waterproof item found", "Seattle weather appropriate", "Cart updated"]
            }
          ]
        }
      },
      'starbucks.com': {
        simple: {
          coffee: [
            {
              title: "Order Seattle coffee culture",
              description: "Find {product} representing Seattle's coffee heritage",
              steps: ["Browse coffee selection", "Look for Seattle-roasted options", "Add to cart"],
              successCriteria: ["Seattle coffee found", "Authentic local selection", "Order placed"]
            }
          ]
        }
      }
    };

    const siteTemplates = (templates as any)[hostname] || templates['amazon.com']; // Fallback
    const typeTemplates = (siteTemplates as any)[taskType] || (siteTemplates as any)['simple'];
    const categoryTemplates = (typeTemplates as any)[category] || (typeTemplates as any)[Object.keys(typeTemplates)[0]];
    
    return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  }

  // Populate template with specific values
  private async populateTask(template: any, website: string, siteContext: any): Promise<GeneratedTask> {
    const variables = this.extractVariables(template);
    const populatedTemplate = await this.fillVariables(template, variables, siteContext);
    
    return {
      id: this.generateTaskId(),
      type: this.determineTaskType(template),
      difficulty: this.determineDifficulty(template),
      title: populatedTemplate.title,
      description: populatedTemplate.description,
      steps: populatedTemplate.steps,
      website,
      category: siteContext.categories[0],
      estimatedTime: this.estimateCompletionTime(template),
      successCriteria: populatedTemplate.successCriteria,
      tags: this.generateTags(populatedTemplate, siteContext),
      context: {
        targetElements: this.predictTargetElements(populatedTemplate, siteContext),
        expectedPages: this.predictPageFlow(populatedTemplate),
        alternativeApproaches: this.generateAlternatives(populatedTemplate)
      }
    };
  }

  // Extract variables from template (e.g., {product}, {price})
  private extractVariables(template: any): string[] {
    const text = JSON.stringify(template);
    const matches = text.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  }

  // Fill template variables with real values
  private async fillVariables(template: any, variables: string[], siteContext: any): Promise<any> {
    const values = {};
    
    for (const variable of variables) {
      (values as any)[variable] = await this.generateVariableValue(variable, siteContext);
    }
    
    // Replace variables in template - recursive approach to avoid JSON parsing issues
    return this.replaceVariablesInObject(template, values);
  }

  // Recursively replace variables in object without JSON stringification
  private replaceVariablesInObject(obj: any, values: Record<string, string>): any {
    if (typeof obj === 'string') {
      // Replace all variables in the string
      let result = obj;
      for (const [key, value] of Object.entries(values)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return result;
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariablesInObject(item, values));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, values);
      }
      return result;
    }
    
    return obj;
  }

  // Get website-specific shopping context for OpenAI prompts
  private getWebsiteShoppingContext(hostname: string): any {
    const contexts = {
      'rei.com': {
        description: 'Leading outdoor gear and apparel retailer',
        storeType: 'Outdoor Recreation & Sporting Goods',
        products: ['hiking gear', 'camping equipment', 'outdoor clothing', 'bikes', 'climbing gear', 'winter sports gear'],
        features: ['expert advice', 'local store pickup', 'member benefits', 'size guides', 'product reviews']
      },
      'nordstrom.com': {
        description: 'Premium department store with fashion and home goods',
        storeType: 'Department Store & Fashion',
        products: ['designer clothing', 'shoes', 'handbags', 'jewelry', 'beauty products', 'home decor'],
        features: ['personal styling', 'free shipping/returns', 'price matching', 'beauty services', 'wedding registry']
      },
      'starbucks.com': {
        description: 'Global coffeehouse chain with retail products',
        storeType: 'Coffee & Lifestyle Retail',
        products: ['coffee beans', 'brewing equipment', 'mugs & tumblers', 'food items', 'gift cards'],
        features: ['mobile ordering', 'rewards program', 'subscription service', 'store locator', 'seasonal offerings']
      },
      'nike.com': {
        description: 'Athletic footwear and apparel brand',
        storeType: 'Athletic Wear & Footwear',
        products: ['sneakers', 'athletic clothing', 'sports equipment', 'team merchandise', 'accessories'],
        features: ['Nike customization', 'size guides', 'athlete collections', 'sport-specific gear', 'mobile app integration']
      },
      'amazon.com': {
        description: 'Global e-commerce marketplace',
        storeType: 'Online Marketplace',
        products: ['electronics', 'books', 'home goods', 'clothing', 'groceries', 'virtually everything'],
        features: ['Prime shipping', 'reviews/ratings', 'recommendations', 'price comparison', 'multiple sellers']
      },
      'uniqlo.com': {
        description: 'Japanese casual wear designer and retailer',
        storeType: 'Fast Fashion & Basics',
        products: ['basic clothing', 'seasonal collections', 'outerwear', 'undergarments', 'accessories'],
        features: ['size customization', 'seasonal lookbooks', 'fabric technology', 'coordinated outfits', 'global shipping']
      },
      'hm.com': {
        description: 'Swedish fast fashion retailer with trendy, affordable clothing',
        storeType: 'Fast Fashion & Trendy Apparel',
        products: ['trendy clothing', 'seasonal fashion', 'accessories', 'shoes', 'home textiles', 'beauty products'],
        features: ['latest trends', 'sustainable collections', 'size inclusivity', 'seasonal campaigns', 'fashion collaborations']
      },
      'www2.hm.com': {
        description: 'Swedish fast fashion retailer with trendy, affordable clothing',
        storeType: 'Fast Fashion & Trendy Apparel', 
        products: ['trendy clothing', 'seasonal fashion', 'accessories', 'shoes', 'home textiles', 'beauty products'],
        features: ['latest trends', 'sustainable collections', 'size inclusivity', 'seasonal campaigns', 'fashion collaborations']
      },
      'filson.com': {
        description: 'Seattle-based premium outdoor and workwear brand since 1897',
        storeType: 'Premium Outdoor & Workwear',
        products: ['rugged outerwear', 'leather bags', 'wool clothing', 'boots', 'classic Seattle style', 'durable workwear'],
        features: ['lifetime guarantee', 'Seattle heritage', 'handcrafted quality', 'repair service', 'premium materials']
      },
      'prismseattle.com': {
        description: 'Seattle local fashion boutique with curated contemporary styles',
        storeType: 'Local Fashion Boutique',
        products: ['contemporary clothing', 'designer pieces', 'accessories', 'unique finds', 'local designers'],
        features: ['curated selection', 'personal styling', 'local Seattle fashion', 'boutique experience', 'unique pieces']
      },
      'millieseattle.com': {
        description: 'Seattle boutique specializing in modern women\'s fashion',
        storeType: 'Local Women\'s Boutique',
        products: ['women\'s clothing', 'dresses', 'tops', 'accessories', 'modern styles', 'contemporary fashion'],
        features: ['modern aesthetic', 'Seattle local', 'women-focused', 'fashion-forward', 'boutique service']
      },
      'elmboutique.com': {
        description: 'Seattle fashion boutique with eclectic and artistic clothing',
        storeType: 'Local Fashion Boutique',
        products: ['artistic clothing', 'unique fashion', 'accessories', 'eclectic styles', 'independent designers'],
        features: ['artistic curation', 'unique finds', 'Seattle local', 'independent brands', 'creative fashion']
      },
      'surlatable.com': {
        description: 'Premium kitchen and cooking equipment retailer',
        storeType: 'Kitchen & Cooking Equipment',
        products: ['cookware', 'kitchen appliances', 'baking supplies', 'cutlery', 'kitchen gadgets', 'food items'],
        features: ['cooking classes', 'expert advice', 'professional quality', 'recipe resources', 'kitchen design']
      },
      'williams-sonoma.com': {
        description: 'Premium home and kitchen retailer',
        storeType: 'Home & Kitchen',
        products: ['cookware', 'home decor', 'furniture', 'bedding', 'kitchen appliances', 'holiday items'],
        features: ['design services', 'registry', 'seasonal collections', 'premium brands', 'home styling']
      },
      'homedepot.com': {
        description: 'Home improvement and hardware retailer',
        storeType: 'Home Improvement & Hardware',
        products: ['tools', 'building materials', 'garden supplies', 'appliances', 'home improvement', 'paint'],
        features: ['installation services', 'project guides', 'bulk ordering', 'contractor services', 'local pickup']
      },
      'target.com': {
        description: 'General merchandise retailer with style and value',
        storeType: 'General Merchandise',
        products: ['clothing', 'home goods', 'electronics', 'groceries', 'beauty', 'toys', 'seasonal items'],
        features: ['Target Circle rewards', 'same-day delivery', 'exclusive brands', 'pharmacy', 'grocery pickup']
      }
    };

    return (contexts as any)[hostname] || {
      description: 'E-commerce website',
      storeType: 'Online Retail Store',
      products: ['various products'],
      features: ['online shopping', 'product search', 'shopping cart']
    };
  }

  // Generate specific values for variables with Seattle context
  private async generateVariableValue(variable: string, siteContext: any): Promise<string> {
    const seattleGenerators = {
      product: () => this.randomChoice([
        'waterproof hiking boots', 'rain jacket', 'coffee beans', 'fleece pullover',
        'insulated water bottle', 'daypack', 'wool socks', 'umbrella', 'Seahawks jersey', 'local honey'
      ]),
      price: () => this.randomChoice(['$50', '$100', '$200', '$75', '$150']),
      products: () => this.randomChoice([
        'rain gear', 'hiking boots', 'coffee equipment', 'outdoor apparel', 'Seattle souvenirs'
      ]),
      sport: () => this.randomChoice([
        'hiking', 'cycling', 'kayaking', 'running', 'climbing'
      ]),
      gear: () => this.randomChoice([
        'rain gear', 'hiking boots', 'cycling equipment', 'outdoor clothing', 'camping gear'
      ]),
      clothing_type: () => this.randomChoice([
        'rain jackets', 'wool sweaters', 'hiking pants', 'fleece layers', 'waterproof boots'
      ]),
      number: () => this.randomChoice(['3', '5', '2', '4']),
      category: () => this.randomChoice([
        'Pacific Northwest outdoor', 'Seattle weather gear', 'local favorites', 'rainy day essentials'
      ]),
      budget: () => this.randomChoice(['$300', '$500', '$150', '$250']),
      seattle_specific: () => this.randomChoice([
        'for Seattle weather', 'perfect for hiking Mount Rainier', 'ideal for Pike Place Market visits', 
        'great for Seattle coffee culture', 'perfect for Puget Sound activities'
      ])
    };

    return (seattleGenerators as any)[variable] ? (seattleGenerators as any)[variable]() : variable;
  }

  // Build OpenAI prompt for task generation
  private buildTaskGenerationPrompt(hostname: string, siteContext: any, userLevel: string, category?: string): string {
    return `You are a professional AI fine-tuner aimed at collecting training data for an autonomous shopping agent. 

MISSION: Analyze the website ${hostname} and create a realistic shopping task based on what this website actually sells.

STEP 1: ANALYZE THE WEBSITE
First, determine what type of website ${hostname} is:

IF IT'S AN E-COMMERCE STORE (sells products online):
- What products does this website sell?
- What is the store's main category (fashion, electronics, home goods, pet supplies, etc.)?
- What would be typical shopping behaviors on this site?
- What price ranges and product types are common here?

IF IT'S A SERVICE BUSINESS (dog groomer, restaurant, salon, etc.):
- Create an appointment booking task appropriate for their services
- Focus on finding services, checking availability, and booking appointments
- Use realistic scenarios for that type of service business

STEP 2: CREATE APPROPRIATE TASK
ONLY if this is an e-commerce site with online shopping, create a realistic shopping task that:
- Matches the website's actual product catalog and target audience
- Uses realistic product types and price ranges for this specific store  
- Focuses on discovery and cart addition (NOT checkout completion)
- Is appropriate for a ${userLevel} level user
- ${category ? `Focuses on ${category} if relevant to this website` : ''}

IF IT'S A SERVICE BUSINESS: Create an appointment booking task that stops before final confirmation.

TASK REQUIREMENTS:
- Make it realistic for what people actually shop for on ${hostname}
- Use appropriate price ranges for this website's typical products
- Include 2-4 actionable steps
- Focus on browsing, comparing, and adding to cart
- ${userLevel === 'beginner' ? 'Keep steps simple and straightforward' : ''}
- ${userLevel === 'advanced' ? 'Include comparison, filtering, and detailed product selection' : ''}

RESPONSE FORMAT (JSON):
{
  "title": "Concise task title",
  "description": "Detailed task description with specific product/criteria appropriate for ${hostname}",
  "steps": ["Step 1", "Step 2", "Step 3"],
  "successCriteria": ["Criteria 1", "Criteria 2"],
  "estimatedTime": number_in_minutes,
  "tags": ["tag1", "tag2"],
  "difficulty": "${userLevel.toUpperCase()}"
}

EXAMPLES:
FOR E-COMMERCE SITES:
- Fashion site: "Find a trendy summer dress under $60 and matching accessories"
- Electronics: "Compare laptop specifications and find one under $800"
- Pet supplies: "Find dog toys and treats suitable for medium-sized dogs"
- Home goods: "Find coordinating bedroom decor items for a modern style"

FOR SERVICE BUSINESSES:
- Dog groomer: "Book a full grooming appointment for a medium-sized dog (stop before final confirmation)"
- Restaurant: "Make a dinner reservation for 4 people this weekend (stop before confirming)"
- Hair salon: "Schedule a haircut and color appointment (stop before payment)"
- Doctor/Dentist: "Book a routine checkup appointment (stop before final booking)"

Generate 1 task specifically appropriate for ${hostname} now:`;
  }

  // Parse OpenAI response into structured task format
  private parseOpenAITaskResponse(response: string, website: string, userLevel: string): GeneratedTask {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const taskData = JSON.parse(jsonMatch[0]);

      return {
        id: this.generateTaskId(),
        type: this.determineTaskTypeFromDescription(taskData.description),
        difficulty: this.mapDifficultyLevel(userLevel),
        title: taskData.title || 'AI Generated Task',
        description: taskData.description || 'Complete this shopping task',
        steps: Array.isArray(taskData.steps) ? taskData.steps : ['Complete the task'],
        website,
        category: taskData.tags?.[0] || 'general',
        estimatedTime: taskData.estimatedTime || 5,
        successCriteria: Array.isArray(taskData.successCriteria) ? taskData.successCriteria : ['Task completed'],
        tags: Array.isArray(taskData.tags) ? taskData.tags : ['ai-generated'],
        context: {
          targetElements: this.predictTargetElements(taskData, {}),
          expectedPages: this.predictPageFlow(taskData),
          alternativeApproaches: ['Use search instead of navigation', 'Filter first, then browse']
        }
      };
    } catch (error) {
      this.logger.error('Failed to parse OpenAI task response', { error, response });
      // Return a fallback task structure
      return this.createFallbackTask(website, userLevel);
    }
  }

  // Helper methods for OpenAI task generation
  private determineTaskTypeFromDescription(description: string): TaskType {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('compare') || lowerDesc.includes('vs')) return TaskType.COMPARISON;
    if (lowerDesc.includes('find') && lowerDesc.includes('add')) return TaskType.SIMPLE;
    if (lowerDesc.includes('complete') || lowerDesc.includes('checkout')) return TaskType.COMPLEX;
    return TaskType.WORKFLOW;
  }

  private mapDifficultyLevel(userLevel: string): TaskDifficulty {
    switch (userLevel.toLowerCase()) {
      case 'beginner': return TaskDifficulty.BEGINNER;
      case 'intermediate': return TaskDifficulty.INTERMEDIATE;
      case 'advanced': return TaskDifficulty.ADVANCED;
      default: return TaskDifficulty.BEGINNER;
    }
  }

  private createFallbackTask(website: string, userLevel: string): GeneratedTask {
    return {
      id: this.generateTaskId(),
      type: TaskType.SIMPLE,
      difficulty: this.mapDifficultyLevel(userLevel),
      title: 'Browse and explore products',
      description: 'Explore the website and find products that interest you',
      steps: ['Browse products', 'Select an item', 'Add to cart'],
      website,
      category: 'general',
      estimatedTime: 5,
      successCriteria: ['Product found', 'Item added to cart'],
      tags: ['fallback'],
      context: {
        targetElements: ['search-box', 'product-grid'],
        expectedPages: ['homepage', 'search-results'],
        alternativeApproaches: ['Use category navigation']
      }
    };
  }

  // Helper methods
  private randomChoice(array: string[]): string {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineTaskType(template: any): TaskType {
    if (template.steps.length <= 4) return TaskType.SIMPLE;
    if (template.description.includes('compare')) return TaskType.COMPARISON;
    if (template.steps.length > 6) return TaskType.COMPLEX;
    return TaskType.WORKFLOW;
  }

  private determineDifficulty(template: any): TaskDifficulty {
    const stepCount = template.steps.length;
    if (stepCount <= 3) return TaskDifficulty.BEGINNER;
    if (stepCount <= 5) return TaskDifficulty.INTERMEDIATE;
    return TaskDifficulty.ADVANCED;
  }

  private estimateCompletionTime(template: any): number {
    return template.steps.length * 2; // 2 minutes per step estimate
  }

  private generateTags(template: any, siteContext: any): string[] {
    const tags = [];
    tags.push(siteContext.categories[0]);
    if (template.description.includes('compare')) tags.push('comparison');
    if (template.description.includes('budget')) tags.push('price-conscious');
    return tags;
  }

  private predictTargetElements(template: any, siteContext: any): string[] {
    const elements = ['search-box', 'filter-options', 'product-grid'];
    if (template.description.includes('cart')) elements.push('add-to-cart-button');
    return elements;
  }

  private predictPageFlow(template: any): string[] {
    return ['homepage', 'search-results', 'product-detail'];
  }

  private generateAlternatives(template: any): string[] {
    return ['Use category navigation instead of search', 'Filter first, then search'];
  }

  // Store task in database
  private async storeTask(task: GeneratedTask): Promise<void> {
    try {
      await this.prisma.generatedTask.create({
        data: {
          id: task.id,
          type: task.type,
          difficulty: task.difficulty,
          title: task.title,
          description: task.description,
          steps: JSON.stringify(task.steps),
          website: task.website,
          category: task.category,
          estimatedTime: task.estimatedTime,
          successCriteria: JSON.stringify(task.successCriteria),
          tags: JSON.stringify(task.tags),
          context: JSON.stringify(task.context),
          createdAt: new Date(),
          status: TaskAvailability.AVAILABLE
        }
      });
    } catch (error) {
      this.logger.error('Failed to store task', { taskId: task.id, error });
      // Don't throw - task generation should continue even if storage fails
    }
  }

  // Assign task to user/session
  async assignTask(taskId: string, sessionId: string, userId: string = 'anonymous'): Promise<TaskAssignment> {
    const assignment: TaskAssignment = {
      taskId,
      sessionId,
      userId,
      assignedAt: new Date(),
      status: TaskAssignmentStatus.ASSIGNED
    };

    try {
      await this.prisma.taskAssignment.create({
        data: {
          taskId: assignment.taskId,
          sessionId: assignment.sessionId,
          userId: assignment.userId,
          assignedAt: assignment.assignedAt,
          status: assignment.status
        }
      });
    } catch (error) {
      this.logger.error('Failed to store task assignment', { taskId, sessionId, error });
    }

    return assignment;
  }

  // Update task progress
  async updateTaskStatus(
    sessionId: string, 
    status: TaskAssignment['status'], 
    automationSequence?: any[],
    completionTime?: number
  ): Promise<void> {
    try {
      await this.prisma.taskAssignment.updateMany({
        where: { sessionId },
        data: {
          status,
          automationSequence: automationSequence ? JSON.stringify(automationSequence) : undefined,
          completionTime
        }
      });
    } catch (error) {
      this.logger.error('Failed to update task status', { sessionId, status, error });
    }
  }

  // Get task for session
  async getSessionTask(sessionId: string): Promise<{ task: GeneratedTask; assignment: TaskAssignment } | null> {
    try {
      const assignment = await this.prisma.taskAssignment.findFirst({
        where: { sessionId },
        include: {
          task: true
        }
      });

      if (!assignment || !assignment.task) return null;

      const task: GeneratedTask = {
        id: assignment.task.id,
        type: assignment.task.type as any,
        difficulty: assignment.task.difficulty as any,
        title: assignment.task.title,
        description: assignment.task.description,
        steps: JSON.parse(assignment.task.steps),
        website: assignment.task.website,
        category: assignment.task.category,
        estimatedTime: assignment.task.estimatedTime,
        successCriteria: JSON.parse(assignment.task.successCriteria),
        tags: JSON.parse(assignment.task.tags),
        context: JSON.parse(assignment.task.context)
      };

      const taskAssignment: TaskAssignment = {
        taskId: assignment.taskId,
        sessionId: assignment.sessionId,
        userId: assignment.userId,
        assignedAt: assignment.assignedAt,
        status: assignment.status as any,
        completionTime: assignment.completionTime || undefined,
        automationSequence: assignment.automationSequence ? 
          JSON.parse(assignment.automationSequence) : undefined
      };

      return { task, assignment: taskAssignment };
    } catch (error) {
      this.logger.error('Failed to get session task', { sessionId, error });
      return null;
    }
  }
}