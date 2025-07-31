/**
 * Ingestion Services Index
 * 
 * Exports all specialized ingestion services for the DirectSessionParser refactoring
 */

export { NavigationAnalysisService, type INavigationAnalysisService } from './navigation-analysis.service';
export { ProductExtractionService, type IProductExtractionService } from './product-extraction.service';
export { ShoppingFlowAnalysisService, type IShoppingFlowAnalysisService } from './shopping-flow-analysis.service';
export { PricingAndAvailabilityService, type IPricingAndAvailabilityService } from './pricing-availability.service';
export { UIComponentAnalysisService, type IUIComponentAnalysisService } from './ui-component-analysis.service';
export { ProductVariantService, type IProductVariantService } from './product-variant.service';
export { InteractionPatternService, type IInteractionPatternService } from './interaction-pattern.service';
export { DomainInformationService, type IDomainInformationService } from './domain-information.service';