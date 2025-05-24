/**
 * Progress Tracker Implementation
 * 
 * Tracks progress of long-running operations with detailed metrics,
 * time estimation, and hierarchical progress support.
 */

import { EventEmitter } from 'events';

/**
 * Progress step definition
 */
export interface ProgressStep {
  /** Step identifier */
  id: string;
  /** Step name/description */
  name: string;
  /** Step weight (for weighted progress calculation) */
  weight: number;
  /** Whether step is completed */
  completed: boolean;
  /** Step start time */
  startedAt?: Date;
  /** Step completion time */
  completedAt?: Date;
  /** Step progress (0-100) */
  progress: number;
  /** Step metadata */
  metadata?: Record<string, any>;
  /** Sub-steps (for hierarchical progress) */
  subSteps?: ProgressStep[];
}

/**
 * Progress tracking configuration
 */
export interface ProgressTrackerConfig {
  /** Whether to enable time estimation */
  enableTimeEstimation: boolean;
  /** Whether to enable detailed logging */
  enableLogging: boolean;
  /** Progress update throttle in milliseconds */
  updateThrottle: number;
  /** Whether to track sub-step progress */
  enableSubSteps: boolean;
  /** Maximum history entries to keep */
  maxHistoryEntries: number;
}

/**
 * Progress snapshot for history
 */
export interface ProgressSnapshot {
  /** Snapshot timestamp */
  timestamp: Date;
  /** Overall progress percentage */
  progress: number;
  /** Current step */
  currentStep?: string;
  /** Estimated time remaining */
  estimatedTimeRemaining?: number;
  /** Processing rate (items/second) */
  processingRate?: number;
}

/**
 * Time estimation data
 */
export interface TimeEstimation {
  /** Estimated total duration in milliseconds */
  estimatedTotalDuration: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining: number;
  /** Estimated completion time */
  estimatedCompletionTime: Date;
  /** Current processing rate (progress/second) */
  processingRate: number;
  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Progress statistics
 */
export interface ProgressStats {
  /** Total elapsed time */
  totalElapsedTime: number;
  /** Average step duration */
  averageStepDuration: number;
  /** Fastest step duration */
  fastestStepDuration: number;
  /** Slowest step duration */
  slowestStepDuration: number;
  /** Completed steps count */
  completedSteps: number;
  /** Total steps count */
  totalSteps: number;
  /** Current processing rate */
  currentProcessingRate: number;
  /** Average processing rate */
  averageProcessingRate: number;
}

/**
 * Default progress tracker configuration
 */
const DEFAULT_PROGRESS_TRACKER_CONFIG: ProgressTrackerConfig = {
  enableTimeEstimation: true,
  enableLogging: false,
  updateThrottle: 100, // 100ms
  enableSubSteps: true,
  maxHistoryEntries: 1000,
};

/**
 * Progress tracker for monitoring operation progress
 */
export class ProgressTracker extends EventEmitter {
  private readonly config: ProgressTrackerConfig;
  private readonly operationId: string;
  private readonly steps = new Map<string, ProgressStep>();
  private readonly stepOrder: string[] = [];
  private readonly history: ProgressSnapshot[] = [];
  private readonly stepDurations: number[] = [];
  
  private startTime?: Date;
  private lastUpdateTime?: Date;
  private currentStepId?: string;
  private overallProgress = 0;
  private isCompleted = false;
  private isCancelled = false;
  private lastThrottledUpdate = 0;

  constructor(
    operationId: string,
    config: Partial<ProgressTrackerConfig> = {}
  ) {
    super();
    this.operationId = operationId;
    this.config = { ...DEFAULT_PROGRESS_TRACKER_CONFIG, ...config };
  }

  /**
   * Initialize progress tracking with steps
   * @param steps Array of step definitions
   */
  initialize(steps: Omit<ProgressStep, 'completed' | 'progress'>[]): void {
    if (this.startTime) {
      throw new Error('Progress tracker already initialized');
    }

    this.startTime = new Date();
    this.lastUpdateTime = this.startTime;

    // Normalize weights if not provided
    const totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
    
    for (const stepDef of steps) {
      const step: ProgressStep = {
        ...stepDef,
        weight: stepDef.weight || 1,
        completed: false,
        progress: 0,
      };
      
      // Normalize weight to percentage
      step.weight = (step.weight / totalWeight) * 100;
      
      this.steps.set(step.id, step);
      this.stepOrder.push(step.id);
    }

    this.emit('initialized', {
      operationId: this.operationId,
      totalSteps: steps.length,
      steps: Array.from(this.steps.values()),
    });

    if (this.config.enableLogging) {
      console.log(`Initialized progress tracker for operation: ${this.operationId} with ${steps.length} steps`);
    }
  }

  /**
   * Start a specific step
   * @param stepId Step identifier
   * @param metadata Optional step metadata
   */
  startStep(stepId: string, metadata?: Record<string, any>): void {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    if (step.completed) {
      throw new Error(`Step already completed: ${stepId}`);
    }

    step.startedAt = new Date();
    step.metadata = { ...step.metadata, ...metadata };
    this.currentStepId = stepId;

    this.emit('stepStarted', {
      operationId: this.operationId,
      stepId,
      step,
    });

    if (this.config.enableLogging) {
      console.log(`Started step: ${stepId} (${step.name})`);
    }

    this.updateProgress();
  }

  /**
   * Update progress for a specific step
   * @param stepId Step identifier
   * @param progress Progress percentage (0-100)
   * @param metadata Optional metadata update
   */
  updateStepProgress(
    stepId: string,
    progress: number,
    metadata?: Record<string, any>
  ): void {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    if (step.completed) {
      return; // Ignore updates to completed steps
    }

    progress = Math.max(0, Math.min(100, progress));
    step.progress = progress;
    
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    // Auto-complete step if progress reaches 100%
    if (progress >= 100 && !step.completed) {
      this.completeStep(stepId);
      return;
    }

    this.updateProgress();
  }

  /**
   * Complete a specific step
   * @param stepId Step identifier
   * @param metadata Optional completion metadata
   */
  completeStep(stepId: string, metadata?: Record<string, any>): void {
    const step = this.steps.get(stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }

    if (step.completed) {
      return; // Already completed
    }

    step.completed = true;
    step.progress = 100;
    step.completedAt = new Date();
    
    if (metadata) {
      step.metadata = { ...step.metadata, ...metadata };
    }

    // Record step duration
    if (step.startedAt && step.completedAt) {
      const duration = step.completedAt.getTime() - step.startedAt.getTime();
      this.stepDurations.push(duration);
      
      // Keep only recent durations for rate calculation
      if (this.stepDurations.length > 100) {
        this.stepDurations.shift();
      }
    }

    this.emit('stepCompleted', {
      operationId: this.operationId,
      stepId,
      step,
    });

    if (this.config.enableLogging) {
      console.log(`Completed step: ${stepId} (${step.name})`);
    }

    // Check if all steps are completed
    const allCompleted = Array.from(this.steps.values()).every(s => s.completed);
    if (allCompleted) {
      this.complete();
    } else {
      this.updateProgress();
    }
  }

  /**
   * Add a sub-step to an existing step
   * @param parentStepId Parent step identifier
   * @param subStep Sub-step definition
   */
  addSubStep(
    parentStepId: string,
    subStep: Omit<ProgressStep, 'completed' | 'progress'>
  ): void {
    if (!this.config.enableSubSteps) {
      return;
    }

    const parentStep = this.steps.get(parentStepId);
    if (!parentStep) {
      throw new Error(`Parent step not found: ${parentStepId}`);
    }

    if (!parentStep.subSteps) {
      parentStep.subSteps = [];
    }

    const fullSubStep: ProgressStep = {
      ...subStep,
      completed: false,
      progress: 0,
    };

    parentStep.subSteps.push(fullSubStep);

    this.emit('subStepAdded', {
      operationId: this.operationId,
      parentStepId,
      subStep: fullSubStep,
    });
  }

  /**
   * Update sub-step progress
   * @param parentStepId Parent step identifier
   * @param subStepId Sub-step identifier
   * @param progress Progress percentage (0-100)
   */
  updateSubStepProgress(
    parentStepId: string,
    subStepId: string,
    progress: number
  ): void {
    if (!this.config.enableSubSteps) {
      return;
    }

    const parentStep = this.steps.get(parentStepId);
    if (!parentStep || !parentStep.subSteps) {
      return;
    }

    const subStep = parentStep.subSteps.find(s => s.id === subStepId);
    if (!subStep) {
      return;
    }

    progress = Math.max(0, Math.min(100, progress));
    subStep.progress = progress;

    if (progress >= 100) {
      subStep.completed = true;
      subStep.completedAt = new Date();
    }

    // Update parent step progress based on sub-steps
    const totalSubSteps = parentStep.subSteps.length;
    const completedSubSteps = parentStep.subSteps.filter(s => s.completed).length;
    const avgSubStepProgress = parentStep.subSteps.reduce((sum, s) => sum + s.progress, 0) / totalSubSteps;
    
    this.updateStepProgress(parentStepId, avgSubStepProgress);
  }

  /**
   * Get current overall progress
   * @returns Progress percentage (0-100)
   */
  getProgress(): number {
    return this.overallProgress;
  }

  /**
   * Get current step information
   * @returns Current step or undefined
   */
  getCurrentStep(): ProgressStep | undefined {
    return this.currentStepId ? this.steps.get(this.currentStepId) : undefined;
  }

  /**
   * Get all steps
   * @returns Array of all steps
   */
  getSteps(): ProgressStep[] {
    return this.stepOrder.map(id => this.steps.get(id)!);
  }

  /**
   * Get step by ID
   * @param stepId Step identifier
   * @returns Step or undefined
   */
  getStep(stepId: string): ProgressStep | undefined {
    return this.steps.get(stepId);
  }

  /**
   * Get time estimation
   * @returns Time estimation data or undefined
   */
  getTimeEstimation(): TimeEstimation | undefined {
    if (!this.config.enableTimeEstimation || !this.startTime || this.overallProgress <= 0) {
      return undefined;
    }

    const now = new Date();
    const elapsedTime = now.getTime() - this.startTime.getTime();
    const processingRate = this.overallProgress / (elapsedTime / 1000); // progress per second
    
    if (processingRate <= 0) {
      return undefined;
    }

    const remainingProgress = 100 - this.overallProgress;
    const estimatedTimeRemaining = (remainingProgress / processingRate) * 1000; // milliseconds
    const estimatedTotalDuration = elapsedTime + estimatedTimeRemaining;
    const estimatedCompletionTime = new Date(now.getTime() + estimatedTimeRemaining);
    
    // Calculate confidence based on data points and consistency
    const confidence = Math.min(1, Math.max(0.1, this.stepDurations.length / 10));

    return {
      estimatedTotalDuration,
      estimatedTimeRemaining,
      estimatedCompletionTime,
      processingRate,
      confidence,
    };
  }

  /**
   * Get progress statistics
   * @returns Progress statistics
   */
  getStats(): ProgressStats {
    const now = new Date();
    const totalElapsedTime = this.startTime ? now.getTime() - this.startTime.getTime() : 0;
    const completedSteps = Array.from(this.steps.values()).filter(s => s.completed).length;
    const totalSteps = this.steps.size;
    
    let averageStepDuration = 0;
    let fastestStepDuration = Infinity;
    let slowestStepDuration = 0;
    
    if (this.stepDurations.length > 0) {
      averageStepDuration = this.stepDurations.reduce((sum, d) => sum + d, 0) / this.stepDurations.length;
      fastestStepDuration = Math.min(...this.stepDurations);
      slowestStepDuration = Math.max(...this.stepDurations);
    }

    const currentProcessingRate = totalElapsedTime > 0 ? this.overallProgress / (totalElapsedTime / 1000) : 0;
    const averageProcessingRate = this.history.length > 0 ? 
      this.history.reduce((sum, h) => sum + (h.processingRate || 0), 0) / this.history.length : 0;

    return {
      totalElapsedTime,
      averageStepDuration,
      fastestStepDuration: fastestStepDuration === Infinity ? 0 : fastestStepDuration,
      slowestStepDuration,
      completedSteps,
      totalSteps,
      currentProcessingRate,
      averageProcessingRate,
    };
  }

  /**
   * Get progress history
   * @param limit Maximum number of entries to return
   * @returns Array of progress snapshots
   */
  getHistory(limit?: number): ProgressSnapshot[] {
    const history = [...this.history];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Complete the entire operation
   */
  complete(): void {
    if (this.isCompleted) {
      return;
    }

    this.isCompleted = true;
    this.overallProgress = 100;

    // Complete any remaining steps
    for (const step of this.steps.values()) {
      if (!step.completed) {
        step.completed = true;
        step.progress = 100;
        step.completedAt = new Date();
      }
    }

    this.emit('completed', {
      operationId: this.operationId,
      totalElapsedTime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      stats: this.getStats(),
    });

    if (this.config.enableLogging) {
      console.log(`Completed operation: ${this.operationId}`);
    }
  }

  /**
   * Cancel the operation
   * @param reason Cancellation reason
   */
  cancel(reason: string = 'Operation cancelled'): void {
    if (this.isCompleted || this.isCancelled) {
      return;
    }

    this.isCancelled = true;

    this.emit('cancelled', {
      operationId: this.operationId,
      reason,
      progress: this.overallProgress,
    });

    if (this.config.enableLogging) {
      console.log(`Cancelled operation: ${this.operationId} - ${reason}`);
    }
  }

  /**
   * Update overall progress calculation
   */
  private updateProgress(): void {
    if (this.isCancelled || this.isCompleted) {
      return;
    }

    // Calculate weighted progress
    let totalProgress = 0;
    for (const step of this.steps.values()) {
      totalProgress += (step.progress / 100) * step.weight;
    }

    this.overallProgress = Math.max(0, Math.min(100, totalProgress));
    this.lastUpdateTime = new Date();

    // Throttle progress updates
    const now = Date.now();
    if (now - this.lastThrottledUpdate < this.config.updateThrottle) {
      return;
    }
    this.lastThrottledUpdate = now;

    // Add to history
    const timeEstimation = this.getTimeEstimation();
    const snapshot: ProgressSnapshot = {
      timestamp: new Date(),
      progress: this.overallProgress,
      currentStep: this.currentStepId,
      estimatedTimeRemaining: timeEstimation?.estimatedTimeRemaining,
      processingRate: timeEstimation?.processingRate,
    };

    this.history.push(snapshot);

    // Limit history size
    if (this.history.length > this.config.maxHistoryEntries) {
      this.history.shift();
    }

    this.emit('progressUpdated', {
      operationId: this.operationId,
      progress: this.overallProgress,
      currentStep: this.getCurrentStep(),
      timeEstimation,
      snapshot,
    });
  }

  /**
   * Check if operation is completed
   * @returns True if completed
   */
  isOperationCompleted(): boolean {
    return this.isCompleted;
  }

  /**
   * Check if operation is cancelled
   * @returns True if cancelled
   */
  isOperationCancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Get operation ID
   * @returns Operation identifier
   */
  getOperationId(): string {
    return this.operationId;
  }
}