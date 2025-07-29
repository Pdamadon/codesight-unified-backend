/**
 * DOM Context Service
 * 
 * Extracted from training-data-transformer.ts to provide focused DOM context functionality
 * for enhanced Playwright code generation training data.
 * 
 * Provides comprehensive DOM hierarchy, siblings, form relationships, and Playwright-specific
 * selector strategies for AI training.
 */

export interface DomContextService {
  // Existing extracted methods
  extractElementContext(element: any): any;
  extractAccessibilityContext(element: any, attributes: any): string | null;
  extractFormContext(element: any, attributes: any): string | null;
  buildDOMHierarchy(ancestors: any[]): string;
  
  // New enhanced DOM methods
  buildDomHierarchy(element: any, interaction: any): string;
  buildSiblingsContext(element: any, interaction: any): string;
  buildFormContext(element: any, interaction: any, elementContext: any): string;
  extractElementState(element: any, attributes: any): string;
  buildPlaywrightSelectorStrategies(element: any, attributes: any, elementText: string, elementContext: any): string;
}

export class DomContextServiceImpl implements DomContextService {

  /**
   * EXTRACTED: Original element context extraction
   */
  extractElementContext(element: any): any {
    const context: any = {};
    
    context.tag = element?.tag || 'unknown';
    
    if (element?.attributes) {
      const keyAttrs = Object.entries(element.attributes)
        .slice(0, 3)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      context.attributes = keyAttrs;
    }
    
    if (element?.computedStyles) {
      const keyStyles = Object.entries(element.computedStyles)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join('; ');
      context.computedStyles = keyStyles;
    }
    
    // Build DOM hierarchy from ancestors (legacy)
    if (element?.ancestors) {
      context.domHierarchy = this.buildDOMHierarchy(element.ancestors);
    }
    
    // Determine element type and context
    context.elementType = this.determineElementType(element);
    context.clickable = this.isClickable(element);
    context.parentContainer = this.extractParentContainer(element);
    
    // Extract accessibility and form context
    const attributes = element?.attributes || {};
    context.accessibilityContext = this.extractAccessibilityContext(element, attributes);
    context.formContext = this.extractFormContext(element, attributes);
    
    return context;
  }

  /**
   * EXTRACTED: Original accessibility context extraction
   */
  extractAccessibilityContext(element: any, attributes: any): string | null {
    const a11yParts: string[] = [];
    
    // Extract ARIA role and semantic meaning
    const role = attributes.role || this.inferAriaRole(element.tag, attributes);
    if (role) {
      a11yParts.push(`role: ${role}`);
    }
    
    // Extract ARIA labels and descriptions
    const ariaLabel = attributes['aria-label'];
    const ariaLabelledBy = attributes['aria-labelledby'];
    const ariaDescribedBy = attributes['aria-describedby'];
    
    if (ariaLabel) {
      a11yParts.push(`aria-label: ${ariaLabel}`);
    } else if (ariaLabelledBy) {
      a11yParts.push(`aria-labelledby: ${ariaLabelledBy}`);
    }
    
    if (ariaDescribedBy) {
      a11yParts.push(`aria-describedby: ${ariaDescribedBy}`);
    }
    
    // Extract ARIA state information
    const ariaExpanded = attributes['aria-expanded'];
    const ariaSelected = attributes['aria-selected'];
    const ariaChecked = attributes['aria-checked'];
    const ariaDisabled = attributes['aria-disabled'];
    
    if (ariaExpanded !== undefined) {
      a11yParts.push(`expanded: ${ariaExpanded}`);
    }
    if (ariaSelected !== undefined) {
      a11yParts.push(`selected: ${ariaSelected}`);
    }
    if (ariaChecked !== undefined) {
      a11yParts.push(`checked: ${ariaChecked}`);
    }
    if (ariaDisabled !== undefined) {
      a11yParts.push(`disabled: ${ariaDisabled}`);
    }
    
    return a11yParts.length > 0 ? a11yParts.join(', ') : null;
  }

  /**
   * EXTRACTED: Original form context extraction
   */
  extractFormContext(element: any, attributes: any): string | null {
    const formParts: string[] = [];
    
    // Extract form field type
    const inputType = attributes.type || element.tag || 'text';
    formParts.push(`type: ${inputType}`);
    
    // Extract field name/purpose from various sources
    const fieldName = attributes.name || 
                     attributes.id || 
                     attributes['aria-label'] || 
                     attributes.placeholder ||
                     'field';
    formParts.push(`field: ${fieldName}`);
    
    // Extract validation requirements
    const validationInfo: string[] = [];
    if (attributes.required || attributes['aria-required'] === 'true') {
      validationInfo.push('required');
    }
    if (attributes.pattern) {
      validationInfo.push(`pattern: ${attributes.pattern}`);
    }
    if (attributes.min || attributes.max) {
      validationInfo.push(`range: ${attributes.min || '?'}-${attributes.max || '?'}`);
    }
    if (attributes.minlength || attributes.maxlength) {
      validationInfo.push(`length: ${attributes.minlength || '?'}-${attributes.maxlength || '?'}`);
    }
    
    if (validationInfo.length > 0) {
      formParts.push(`validation: ${validationInfo.join(', ')}`);
    }
    
    // Extract current value and state
    if (attributes.value !== undefined) {
      formParts.push(`value: "${attributes.value}"`);
    }
    if (attributes.checked !== undefined) {
      formParts.push(`checked: ${attributes.checked}`);
    }
    if (attributes.selected !== undefined) {
      formParts.push(`selected: ${attributes.selected}`);
    }
    if (attributes.disabled !== undefined) {
      formParts.push(`disabled: ${attributes.disabled}`);
    }
    
    return formParts.length > 0 ? formParts.join(', ') : null;
  }

  /**
   * EXTRACTED: Original DOM hierarchy builder
   */
  buildDOMHierarchy(ancestors: any[]): string {
    if (ancestors.length === 0) return '';
    
    return ancestors.slice(-3).map(a => 
      `${a.tag}${a.classes?.length ? `.${a.classes[0]}` : ''}`
    ).join(' > ');
  }

  /**
   * ENHANCED: Build comprehensive DOM hierarchy for training display
   */
  buildDomHierarchy(element: any, interaction: any): string {
    const ancestors = element?.ancestors || interaction?.context?.ancestors || [];
    if (ancestors.length === 0) return 'No hierarchy available';
    
    const hierarchyParts: string[] = [];
    const relevantAncestors = ancestors.slice(-3); // Last 3 levels (most relevant)
    
    // Add each level with detailed information
    relevantAncestors.forEach((ancestor: any, index: number) => {
      const level = index === 0 ? 'Grandparent' : index === 1 ? 'Parent' : 'Container';
      const tag = ancestor.tag || 'div';
      const classes = ancestor.classes?.slice(0, 2).join('.') || '';
      const id = ancestor.attributes?.id ? `#${ancestor.attributes.id}` : '';
      const dataAttrs = ancestor.attributes ? 
        Object.entries(ancestor.attributes)
          .filter(([k]) => k.startsWith('data-'))
          .slice(0, 1)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ') : '';
      
      let hierarchyLine = `${level}: <${tag}`;
      if (classes) hierarchyLine += ` class="${classes}"`;
      if (id) hierarchyLine += ` ${id}`;
      if (dataAttrs) hierarchyLine += ` ${dataAttrs}`;
      hierarchyLine += '>';
      
      hierarchyParts.push(hierarchyLine);
    });
    
    // Add target element
    const targetTag = element?.tag || 'button';
    const targetClasses = element?.attributes?.class || '';
    const targetId = element?.attributes?.id ? `#${element.attributes.id}` : '';
    const targetDataAttrs = element?.attributes ? 
      Object.entries(element.attributes)
        .filter(([k]) => k.startsWith('data-'))
        .slice(0, 2)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ') : '';
    
    let targetLine = `Target: <${targetTag}`;
    if (targetClasses) targetLine += ` class="${targetClasses}"`;
    if (targetId) targetLine += ` ${targetId}`;
    if (targetDataAttrs) targetLine += ` ${targetDataAttrs}`;
    targetLine += '>';
    
    hierarchyParts.push(`  ${targetLine}`);
    
    return hierarchyParts.join('\n');
  }

  /**
   * ENHANCED: Build comprehensive siblings context
   */
  buildSiblingsContext(element: any, interaction: any): string {
    const siblings = element?.siblingElements || interaction?.element?.siblingElements || [];
    if (siblings.length === 0) return 'No siblings detected';
    
    const siblingParts: string[] = [];
    
    // Process up to 5 siblings for context
    siblings.slice(0, 5).forEach((sibling: any, index: number) => {
      const position = sibling.position === 'before' ? 'Previous' : 
                      sibling.position === 'after' ? 'Next' : 
                      `Sibling ${index + 1}`;
      
      const text = sibling.text || 'No text';
      const selector = sibling.selector || 'No selector';
      const state = this.getSiblingState(sibling);
      
      siblingParts.push(`${position}: "${text}" [${selector}]${state ? ` (${state})` : ''}`);
    });
    
    // Add summary if there are more siblings
    if (siblings.length > 5) {
      siblingParts.push(`... and ${siblings.length - 5} more siblings`);
    }
    
    // Add total count and type summary
    const siblingTypes = siblings.map((s: any) => this.inferElementType(s.selector || '')).filter(Boolean);
    const uniqueTypes = [...new Set(siblingTypes)];
    siblingParts.push(`Total: ${siblings.length} siblings (${uniqueTypes.join(', ')})`);
    
    return siblingParts.join('\n');
  }

  /**
   * ENHANCED: Build comprehensive form context
   */
  buildFormContext(element: any, interaction: any, elementContext: any): string {
    const formContext = elementContext.formContext;
    const attributes = element?.attributes || {};
    
    if (!formContext && !this.isFormElement(element)) {
      return 'No form context';
    }
    
    const formParts: string[] = [];
    
    // Find parent form
    const parentForm = this.findParentForm(element, interaction);
    if (parentForm) {
      const formId = parentForm.id || 'unnamed-form';
      const formAction = parentForm.action || '';
      const formMethod = parentForm.method || 'GET';
      
      formParts.push(`Form Container: <form id="${formId}"${formAction ? ` action="${formAction}"` : ''}${formMethod !== 'GET' ? ` method="${formMethod}"` : ''}>`);
    }
    
    // Related form fields
    const relatedFields = this.findRelatedFormFields(element, interaction);
    if (relatedFields.length > 0) {
      formParts.push('Related Fields:');
      relatedFields.forEach(field => {
        const fieldName = field.name || field.id || 'unnamed';
        const fieldType = field.type || 'text';
        const fieldValue = field.value ? `value: "${field.value}"` : '';
        const fieldState = field.selected ? '✅' : field.disabled ? '❌' : '';
        
        formParts.push(`  - ${fieldName}: <${field.tag || 'input'} type="${fieldType}"${fieldValue ? ` ${fieldValue}` : ''}> ${fieldState}`);
      });
    }
    
    // Label associations
    const associatedLabel = this.findAssociatedLabel(element, interaction);
    if (associatedLabel) {
      formParts.push(`Associated Label: "${associatedLabel}"`);
    }
    
    // Form validation context
    const validationState = this.getFormValidationState(element, attributes);
    if (validationState) {
      formParts.push(`Validation: ${validationState}`);
    }
    
    return formParts.length > 0 ? formParts.join('\n') : 'No form context';
  }

  /**
   * ENHANCED: Extract comprehensive element state
   */
  extractElementState(element: any, attributes: any): string {
    const stateParts: string[] = [];
    
    // Basic state
    const disabled = attributes.disabled || attributes['aria-disabled'] === 'true';
    const selected = attributes.selected || attributes['aria-selected'] === 'true';
    const checked = attributes.checked || attributes['aria-checked'] === 'true';
    const expanded = attributes['aria-expanded'] === 'true';
    const hidden = attributes.hidden || attributes['aria-hidden'] === 'true';
    const required = attributes.required || attributes['aria-required'] === 'true';
    
    // Determine primary state
    if (disabled) {
      stateParts.push('disabled');
    } else {
      stateParts.push('enabled');
    }
    
    // Selection/activation state
    if (selected) {
      stateParts.push('selected');
    } else if (checked) {
      stateParts.push('checked');
    } else if (expanded) {
      stateParts.push('expanded');
    } else {
      stateParts.push('not-selected');
    }
    
    // Visibility state
    if (hidden) {
      stateParts.push('hidden');
    } else {
      stateParts.push('visible');
    }
    
    // Validation state
    if (required) {
      stateParts.push('required');
    }
    
    // Interactive state
    const interactive = this.isInteractiveElement(element);
    if (interactive && !disabled) {
      stateParts.push('interactive');
    }
    
    return stateParts.join(', ');
  }

  /**
   * ENHANCED: Build Playwright-specific selector strategies
   */
  buildPlaywrightSelectorStrategies(element: any, attributes: any, elementText: string, elementContext: any): string {
    const strategies: string[] = [];
    
    // 1. Data attribute strategy (most reliable)
    const dataAttrs = Object.entries(attributes)
      .filter(([k]) => k.startsWith('data-'))
      .slice(0, 2);
    
    if (dataAttrs.length > 0) {
      const [dataKey, dataValue] = dataAttrs[0];
      strategies.push(`1. Data Attribute: page.locator('${element.tag || 'button'}[${dataKey}="${dataValue}"]') (most reliable)`);
    }
    
    // 2. Accessibility strategy (most semantic)
    const ariaLabel = attributes['aria-label'];
    const role = attributes.role || this.inferAriaRole(element.tag, attributes);
    
    if (role && (ariaLabel || elementText)) {
      const name = ariaLabel || elementText;
      strategies.push(`2. Accessibility: page.getByRole('${role}', { name: '${name}' }) (most semantic)`);
    }
    
    // 3. Text content strategy
    if (elementText && elementText.trim()) {
      strategies.push(`3. Text Content: page.getByText('${elementText.trim()}') (visual context)`);
    }
    
    // 4. Parent context strategy
    const parentContainer = elementContext.parentContainer;
    if (parentContainer && elementText) {
      strategies.push(`4. Parent Context: page.locator('${parentContainer}').getByText('${elementText}') (scoped context)`);
    }
    
    // 5. Form context strategy
    if (elementContext.formContext && this.isFormElement(element)) {
      const fieldName = attributes.name || attributes.id;
      if (fieldName) {
        strategies.push(`5. Form Context: page.getByLabel('${fieldName}') (form association)`);
      }
    }
    
    // 6. CSS selector strategy
    const cssSelector = this.buildCSSSelector(element, attributes);
    if (cssSelector) {
      strategies.push(`6. CSS Selector: page.locator('${cssSelector}') (structural)`);
    }
    
    // 7. XPath strategy (fallback)
    const xpath = this.buildXPathSelector(element, attributes);
    if (xpath) {
      strategies.push(`7. XPath: page.locator('${xpath}') (fallback)`);
    }
    
    return strategies.length > 0 ? strategies.join('\n') : 'No selector strategies available';
  }

  // Helper methods
  private determineElementType(element: any): string {
    const tag = element?.tag?.toLowerCase() || '';
    const attributes = element?.attributes || {};
    const className = attributes.class || '';
    
    if (tag === 'button' || attributes.type === 'button') return 'Button';
    if (tag === 'a') return 'Link';
    if (tag === 'input') {
      const inputType = attributes.type || 'text';
      return `${inputType.charAt(0).toUpperCase() + inputType.slice(1)} Input`;
    }
    if (tag === 'select') return 'Select Dropdown';
    if (className.includes('btn')) return 'Button';
    if (className.includes('link')) return 'Link';
    
    return 'Interactive Element';
  }

  private isClickable(element: any): boolean {
    const tag = element?.tag?.toLowerCase() || '';
    const attributes = element?.attributes || {};
    
    return ['button', 'a', 'input'].includes(tag) || 
           attributes.onclick || 
           attributes.role === 'button' ||
           (attributes.class || '').includes('btn');
  }

  private extractParentContainer(element: any): string {
    const ancestors = element?.ancestors || [];
    const parent = ancestors[ancestors.length - 1];
    
    if (parent?.classes?.length > 0) {
      return `.${parent.classes[0]}`;
    }
    if (parent?.attributes?.id) {
      return `#${parent.attributes.id}`;
    }
    if (parent?.tag) {
      return parent.tag;
    }
    
    return 'Unknown container';
  }

  private inferAriaRole(tag: string, attributes: any): string {
    if (attributes.role) return attributes.role;
    
    const tagRoleMap: { [key: string]: string } = {
      'button': 'button',
      'a': 'link',
      'input': attributes.type === 'checkbox' ? 'checkbox' : 
               attributes.type === 'radio' ? 'radio' : 'textbox',
      'select': 'combobox',
      'textarea': 'textbox',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'section': 'region'
    };
    
    return tagRoleMap[tag] || 'generic';
  }

  private getSiblingState(sibling: any): string {
    const states: string[] = [];
    
    if (sibling.selected) states.push('selected');
    if (sibling.disabled) states.push('disabled');
    if (sibling.checked) states.push('checked');
    
    return states.join(', ');
  }

  private inferElementType(selector: string): string {
    if (selector.includes('button')) return 'button';
    if (selector.includes('input')) return 'input';
    if (selector.includes('select')) return 'select';
    if (selector.includes('a')) return 'link';
    
    return 'element';
  }

  private isFormElement(element: any): boolean {
    const tag = element?.tag?.toLowerCase() || '';
    return ['input', 'select', 'textarea', 'button'].includes(tag);
  }

  private findParentForm(element: any, interaction: any): any {
    const ancestors = element?.ancestors || interaction?.context?.ancestors || [];
    return ancestors.find((ancestor: any) => ancestor.tag === 'form');
  }

  private findRelatedFormFields(element: any, interaction: any): any[] {
    // This would need to be implemented based on your data structure
    // For now, return empty array
    return [];
  }

  private findAssociatedLabel(element: any, interaction: any): string | null {
    const attributes = element?.attributes || {};
    
    if (attributes['aria-label']) {
      return attributes['aria-label'];
    }
    
    if (attributes['aria-labelledby']) {
      // Would need to look up the element with this ID
      return `Reference: ${attributes['aria-labelledby']}`;
    }
    
    if (attributes.id) {
      // Would need to find label with for="${attributes.id}"
      return `For element: ${attributes.id}`;
    }
    
    return null;
  }

  private getFormValidationState(element: any, attributes: any): string | null {
    const validationParts: string[] = [];
    
    if (attributes.required) validationParts.push('required');
    if (attributes.pattern) validationParts.push('pattern validation');
    if (attributes.minlength || attributes.maxlength) validationParts.push('length validation');
    if (attributes.min || attributes.max) validationParts.push('range validation');
    
    return validationParts.length > 0 ? validationParts.join(', ') : null;
  }

  private isInteractiveElement(element: any): boolean {
    const tag = element?.tag?.toLowerCase() || '';
    const attributes = element?.attributes || {};
    
    return ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
           attributes.onclick ||
           attributes.role === 'button' ||
           attributes.tabindex !== undefined;
  }

  private buildCSSSelector(element: any, attributes: any): string {
    const tag = element?.tag || 'button';
    const className = attributes.class;
    const id = attributes.id;
    
    let selector = tag;
    
    if (id) {
      selector += `#${id}`;
    } else if (className) {
      const firstClass = className.split(' ')[0];
      selector += `.${firstClass}`;
    }
    
    return selector;
  }

  private buildXPathSelector(element: any, attributes: any): string {
    const tag = element?.tag || 'button';
    const text = element?.text;
    
    if (text) {
      return `//${tag}[contains(text(), '${text}')]`;
    }
    
    if (attributes.class) {
      return `//${tag}[@class='${attributes.class}']`;
    }
    
    return `//${tag}`;
  }
}