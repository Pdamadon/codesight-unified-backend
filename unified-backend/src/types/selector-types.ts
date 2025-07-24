/**
 * Shared types for Selector Strategy Service
 * 
 * Based on rich interaction data structure from enhanced 6-group collection
 */

export interface SelectorData {
  /** XPath selector with high reliability */
  xpath?: string;
  /** CSS path selector */
  cssPath?: string; 
  /** Primary selector (may be unreliable) */
  primary?: string;
  /** Alternative selector options */
  alternatives?: string[];
  /** Reliability scores for each selector (0.0 - 1.0) */
  reliability?: Record<string, number>;
}

export interface SelectorResult {
  /** Best selector based on reliability scores */
  bestSelector: string;
  /** Backup selectors in priority order */
  backupSelectors: string[];
  /** Reliability score of best selector */
  reliability: number;
}

export type ActionType = 
  | 'click' 
  | 'hover' 
  | 'focus' 
  | 'input' 
  | 'type' 
  | 'select'
  | 'scroll'
  | 'navigation'
  | 'key_press'
  | 'form_submit';

export interface PlaywrightAction {
  /** Playwright command */
  action: string;
  /** Action type for context */
  type: ActionType;
  /** Reliability score */
  reliability: number;
}