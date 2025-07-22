import { PrismaClient, TaskType, TaskDifficulty, TaskAvailability, TaskAssignmentStatus } from '@prisma/client';
import { Logger } from '../utils/logger';
import { OpenAIIntegrationService } from './openai-integration-clean';

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
  private openaiService: OpenAIIntegrationService;

  constructor(prisma: PrismaClient, openaiService: OpenAIIntegrationService) {
    this.prisma = prisma;
    this.logger = new Logger('TaskGenerationService');
    this.openaiService = openaiService;
  }

  // Generate contextual task based on website and user level
  async generateTask(website: string, userLevel: string = 'beginner', category?: string): Promise<GeneratedTask> {
    try {
      this.logger.info('Generating task', { website, userLevel, category });

      const siteContext = await this.analyzeSiteCapabilities(website);
      const task = await this.createContextualTask(website, siteContext, userLevel, category);
      
      // Store task in database for tracking
      await this.storeTask(task);
      
      return task;
    } catch (error) {
      this.logger.error('Task generation failed', { website, error });
      throw error;
    }
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

    return (siteCapabilities as any)[hostname] || {
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

  // Generate specific values for variables
  private async generateVariableValue(variable: string, siteContext: any): Promise<string> {
    const generators = {
      product: () => this.randomChoice([
        'wireless earbuds', 'running shoes', 'backpack', 'water bottle', 
        't-shirt', 'jeans', 'jacket', 'sneakers', 'watch', 'phone case'
      ]),
      price: () => this.randomChoice(['$50', '$100', '$200', '$25', '$75']),
      products: () => this.randomChoice([
        'bluetooth speakers', 'running shoes', 'laptops', 'headphones'
      ]),
      sport: () => this.randomChoice([
        'running', 'basketball', 'tennis', 'training', 'football'
      ]),
      gear: () => this.randomChoice([
        'shoes', 'shorts', 'shirt', 'equipment', 'accessories'
      ]),
      clothing_type: () => this.randomChoice([
        'shirts', 'pants', 'sweaters', 'jackets', 'basics'
      ]),
      number: () => this.randomChoice(['3', '5', '2', '4']),
      category: () => this.randomChoice([
        'home office', 'workout', 'travel', 'gaming'
      ]),
      budget: () => this.randomChoice(['$300', '$500', '$150', '$250'])
    };

    return (generators as any)[variable] ? (generators as any)[variable]() : variable;
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