/**
 * Feature Flags Configuration
 * 
 * This module manages feature flags for progressive MCP compliance.
 * Features are disabled by default to ensure backward compatibility.
 */

/**
 * Feature flags interface
 */
export interface FeatureFlags {
  /**
   * Enable resource support (MCP resources capability)
   */
  resources: boolean;
  
  /**
   * Enable enhanced error format (MCP-compliant error responses)
   */
  enhancedErrors: boolean;
  
  /**
   * Enable progress notifications for long-running operations
   */
  progressNotifications: boolean;
  
  /**
   * Enable advanced logging capabilities
   */
  logging: boolean;
  
  /**
   * Enable sampling/completion features
   */
  sampling: boolean;
}

/**
 * Default feature flags (all disabled for backward compatibility)
 */
const DEFAULT_FLAGS: FeatureFlags = {
  resources: false,
  enhancedErrors: false,
  progressNotifications: false,
  logging: false,
  sampling: false
};

/**
 * Load feature flags from environment variables
 */
function loadFeatureFlags(): FeatureFlags {
  return {
    resources: process.env.MCP_FEATURE_RESOURCES === 'true',
    enhancedErrors: process.env.MCP_FEATURE_ENHANCED_ERRORS === 'true',
    progressNotifications: process.env.MCP_FEATURE_PROGRESS_NOTIFICATIONS === 'true',
    logging: process.env.MCP_FEATURE_LOGGING === 'true',
    sampling: process.env.MCP_FEATURE_SAMPLING === 'true'
  };
}

/**
 * Feature flag manager class
 */
export class FeatureFlagManager {
  private flags: FeatureFlags;
  
  constructor() {
    this.flags = loadFeatureFlags();
  }
  
  /**
   * Get all feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }
  
  /**
   * Check if a specific feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }
  
  /**
   * Enable a feature (for testing purposes)
   */
  enable(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
  }
  
  /**
   * Disable a feature (for testing purposes)
   */
  disable(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
  }
  
  /**
   * Reset all flags to defaults
   */
  reset(): void {
    this.flags = { ...DEFAULT_FLAGS };
  }
  
  /**
   * Get a summary of enabled features
   */
  getEnabledFeatures(): string[] {
    return Object.entries(this.flags)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature);
  }
}

// Global feature flag manager instance
export const featureFlags = new FeatureFlagManager();

/**
 * Helper function to check if we should use new error format
 */
export function shouldUseEnhancedErrors(): boolean {
  return featureFlags.isEnabled('enhancedErrors');
}

/**
 * Helper function to check if resources are enabled
 */
export function shouldEnableResources(): boolean {
  return featureFlags.isEnabled('resources');
}

/**
 * Helper function to check if progress notifications are enabled
 */
export function shouldEnableProgressNotifications(): boolean {
  return featureFlags.isEnabled('progressNotifications');
}