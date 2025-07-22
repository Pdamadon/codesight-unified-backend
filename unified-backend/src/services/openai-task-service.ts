import OpenAI from 'openai';
import { Logger } from '../utils/logger';

export interface GeneratedTaskResponse {
  title: string;
  description: string;
  steps: string[];
  successCriteria: string[];
  estimatedTime: number;
  tags: string[];
  difficulty: string;
}

export class OpenAITaskService {
  private openai: OpenAI;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("OpenAITaskService");
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout for task generation
    });
  }

  async generateTask(prompt: string): Promise<string> {
    try {
      this.logger.info("Generating task with OpenAI", { 
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
      });

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // More reliable for JSON generation than gpt-4o-mini
        messages: [
          {
            role: "system",
            content: "You are an expert at creating realistic e-commerce shopping tasks for AI training. Generate tasks focused on Seattle-area shopping. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      // Validate it's proper JSON
      JSON.parse(content);

      this.logger.info("Task generated successfully", { 
        responseLength: content.length,
        model: response.model,
        usage: response.usage 
      });
      
      return content;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error("OpenAI task generation failed", {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Simple health check
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.info("Starting OpenAI health check");
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 5
      });
      const result = !!response.choices[0]?.message?.content;
      this.logger.info("OpenAI health check completed", { result, hasResponse: !!response });
      return result;
    } catch (error) {
      this.logger.error("OpenAI health check failed", {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      return false;
    }
  }
}