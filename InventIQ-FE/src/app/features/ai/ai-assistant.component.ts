import { Component, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AiService,
  ChatMessage,
  AIChatResponse,
  AIImageAnalysisResponse,
  EntityType
} from '../../core/services/ai.service';
import { PermissionService } from '../../core/services/permission.service';

type ImageConversationState = 'idle' | 'waiting_for_entity_type' | 'analyzing_image' | 'waiting_for_confirmation' | 'saving_entity';
type MissingFieldsState = 'idle' | 'collecting_fields' | 'reviewing_data';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatListModule,
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css'
})
export class AiAssistantComponent implements AfterViewInit, OnDestroy {
  @ViewChild('messagesScroll') private readonly messagesScroll!: ElementRef<HTMLDivElement>;
  @ViewChild('imageFileInput') private readonly imageFileInput!: ElementRef<HTMLInputElement>;

  // ===== Chat State =====
  readonly chatForm: FormGroup;
  missingFieldsForm: FormGroup;  // NOT readonly - will be dynamically updated
  readonly messages: ChatMessage[] = [];
  readonly suggestionPrompts = [
    {
      title: 'Show Low Stock Products',
      prompt: 'Show me all products that are running low on stock',
      icon: 'warning'
    },
    {
      title: 'Inventory Summary',
      prompt: 'Give me a complete summary of our current inventory status',
      icon: 'bar_chart'
    },
    {
      title: 'Upload Product Label',
      prompt: 'Help me add a new product by analyzing a label image',
      icon: 'image'
    },
    {
      title: 'Upload Supplier Card',
      prompt: 'Help me add a new supplier by analyzing a business card image',
      icon: 'business_card'
    }
  ];
  showWelcome = true;

  // ===== Image Conversation State Machine =====
  imageConversationState: ImageConversationState = 'idle';
  pendingImageFile: File | null = null;
  pendingImagePreviewUrl: string | null = null;
  pendingEntityType: EntityType | null = null;
  pendingExtractedData: any = null;
  pendingExtractedItems: any[] = [];
  pendingConfidenceNote: string | null = null;

  // ===== Missing Fields State =====
  missingFieldsState: MissingFieldsState = 'idle';
  pendingAction: string | null = null;           // The actual action to perform (e.g., 'create_category')
  pendingData: any = {};                          // Current accumulated data
  missingFields: string[] = [];                   // Fields that need to be filled
  currentFieldIndex = 0;                          // Which field we're currently collecting

  constructor(
    private readonly fb: FormBuilder,
    private readonly aiService: AiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissionService: PermissionService
  ) {
    this.chatForm = this.fb.group({
      message: ['', Validators.required]
    });
    this.missingFieldsForm = this.fb.group({});  // Will be dynamically populated
  }

  ngAfterViewInit(): void {
    this.scrollMessagesToBottom();
  }

  ngOnDestroy(): void {
    this.cleanupImageData();
  }

  // ===== Image File Selection =====
  triggerImageUpload(): void {
    if (!this.canUseAiWriteActions()) {
      this.appendAssistantMessage(
        'You have view-only access. Only Admin and Manager can add items with AI uploads.'
      );
      return;
    }

    this.imageFileInput.nativeElement.click();
  }

  canUseAiWriteActions(): boolean {
    return this.permissionService.canUseAiWriteActions();
  }

  private isAiConfigurationIssue(message: string | null | undefined): boolean {
    const value = (message || '').toLowerCase();

    return (
      value.includes('missing authentication header') ||
      value.includes('openrouter_api_key') ||
      value.includes('ai image analysis is unavailable') ||
      value.includes('ai field extraction is unavailable')
    );
  }

  private isSupportedUpload(file: File): boolean {
    const lowerName = file.name.toLowerCase();

    return (
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type === 'text/csv' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.csv') ||
      lowerName.endsWith('.xls') ||
      lowerName.endsWith('.xlsx')
    );
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.isSupportedUpload(file)) {
      this.appendAssistantMessage(
        'Please upload an image, PDF, CSV, or Excel file.'
      );
      return;
    }

    this.pendingImageFile = file;
    this.showWelcome = false;
    this.pendingImagePreviewUrl = null;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pendingImagePreviewUrl = e.target?.result as string;

        this.appendUserMessageWithImage(
          `I uploaded "${file.name}". I'd like to add this to my inventory.`,
          this.pendingImagePreviewUrl
        );

        this.appendAssistantMessage(
          'What would you like to add? Please say: "Product", "Category", or "Supplier"'
        );
        this.imageConversationState = 'waiting_for_entity_type';
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    } else {
      this.appendUserMessage(`I uploaded "${file.name}". I'd like to add this to my inventory.`);
      this.appendAssistantMessage(
        'What would you like to add from this file? Please say: "Product", "Category", or "Supplier"'
      );
      this.imageConversationState = 'waiting_for_entity_type';
      this.cdr.markForCheck();
    }

    input.value = '';
  }

  // ===== Chat Message Handling =====
  sendMessage(message?: string): void {
    const msg = message || this.chatForm.value.message;
    if (!msg.trim()) return;

    this.showWelcome = false;
    this.appendUserMessage(msg);
    this.chatForm.reset();

    // Skip chat if we're in form-collection mode (user should use form instead)
    if (this.missingFieldsState === 'collecting_fields' || this.missingFieldsState === 'reviewing_data') {
      this.appendAssistantMessage('Please use the form above to provide the required information.');
      return;
    }

    // Handle based on image conversation state
    if (this.imageConversationState === 'waiting_for_entity_type') {
      this.handleEntityTypeResponse(msg);
      return;
    }

    if (this.imageConversationState === 'waiting_for_confirmation') {
      this.handleConfirmationResponse(msg);
      return;
    }

    // Regular chat flow
    const loaderId = this.appendAssistantLoader();

    this.aiService.sendMessage(msg).subscribe({
      next: (response: AIChatResponse) => {
        this.handleChatResponse(loaderId, response);
        this.cdr.markForCheck();
      },
      error: () => {
        this.replaceAssistantMessageWithError(
          loaderId,
          'Failed to get response. Please try again.'
        );
        this.cdr.markForCheck();
      }
    });
  }

  sendQuickPrompt(prompt: string): void {
    // If it's an image prompt and we're not in image conversation, trigger upload
    if ((prompt.includes('image') || prompt.includes('label') || prompt.includes('card')) && 
        this.imageConversationState === 'idle') {
      this.triggerImageUpload();
    } else {
      this.sendMessage(prompt);
    }
  }

  // ===== Response Handler =====
  private handleChatResponse(loaderId: string, response: AIChatResponse): void {
    // Handle missing fields case
    if (response.missingFields && response.missingFields.length > 0) {
      // Extract the actual intent action from the response data
      const intentAction = this.extractActionIntent(response);
      
      if (!intentAction) {
        this.replaceAssistantMessageWithError(
          loaderId,
          'Unable to determine what to create. Please try again with more details.'
        );
        return;
      }

      // Initialize missing fields state
      this.pendingAction = intentAction;
      this.pendingData = response.data || {};
      this.missingFields = response.missingFields;
      this.currentFieldIndex = 0;
      this.missingFieldsState = 'collecting_fields';

      // Build the form with fields for user input
      this.buildMissingFieldsForm();

      // Display message with form
      const promptMsg = `${response.reply}\n\nPlease fill in the required information:`;
      
      this.replaceAssistantMessage(loaderId, {
        success: true,
        reply: promptMsg,
        action: 'missing_fields',
        data: { fields: response.missingFields, totalFields: this.missingFields.length }
      });
      return;
    }

    // Handle regular responses with actions
    this.replaceAssistantMessage(loaderId, response);
  }

  /**
   * Build a form dynamically based on missing fields
   */
  private buildMissingFieldsForm(): void {
    const formControls: { [key: string]: any } = {};
    
    for (const field of this.missingFields) {
      formControls[field] = ['', Validators.required];
    }

    this.missingFieldsForm = this.fb.group(formControls);
  }

  /**
   * Handle form submission when user fills all missing fields
   */
  submitMissingFieldsForm(): void {
    if (this.missingFieldsForm.invalid) {
      this.appendAssistantMessage('Please fill in all required fields.');
      return;
    }

    const formValues = this.missingFieldsForm.value;
    
    // Merge form values with pending data
    this.pendingData = { ...this.pendingData, ...formValues };
    
    // Move to review state
    this.missingFieldsState = 'reviewing_data';
    
    // Show confirmation card
    this.appendAssistantMessage('Let me review this information:');
    
    // Create a message with confirmation details
    const confirmationMsg: ChatMessage = {
      id: this.generateId(),
      sender: 'assistant',
      text: 'Please confirm this information is correct:',
      timestamp: new Date(),
      confirmationDetails: {
        entityType: this.getEntityTypeFromAction(this.pendingAction || ''),
        data: this.pendingData,
        isFormReview: true  // Flag to show action buttons
      }
    };
    
    this.messages.push(confirmationMsg);
    this.scrollMessagesToBottom();
    this.cdr.markForCheck();
  }

  /**
   * Extract entity type from action string
   */
  private getEntityTypeFromAction(action: string): string {
    if (action.includes('product')) return 'product';
    if (action.includes('category')) return 'category';
    if (action.includes('supplier')) return 'supplier';
    return 'unknown';
  }

  /**
   * Extract the intended action from a missing_fields response
   * Checks multiple sources for the action intent:
   * 1. response.data.action (backend-provided intent)
   * 2. Infer from response.data structure (check for product/category/supplier specific fields)
   * 3. Infer from response.reply text
   */
  private extractActionIntent(response: AIChatResponse): string | null {
    // Source 1: Backend explicitly provides the intent
    if (response.data?.action) {
      const action = response.data.action;
      if (action.includes('product') || action === 'create_product') return 'create_product';
      if (action.includes('category') || action === 'create_category') return 'create_category';
      if (action.includes('supplier') || action === 'create_supplier') return 'create_supplier';
    }

    // Source 2: Infer from data structure
    // Check if data already has fields that indicate the entity type
    const data = response.data || {};
    const dataKeys = Object.keys(data).map(k => k.toLowerCase());
    
    // Check for product-specific fields
    if (dataKeys.some(k => ['barcode', 'unit', 'sku', 'productid', 'product_id'].includes(k))) {
      return 'create_product';
    }
    
    // Check for supplier-specific fields
    if (dataKeys.some(k => ['phone', 'email', 'address', 'supplierid', 'supplier_id'].includes(k))) {
      return 'create_supplier';
    }
    
    // Check for category-specific fields
    if (dataKeys.some(k => ['categoryid', 'category_id'].includes(k))) {
      return 'create_category';
    }

    // Source 3: Infer from response text and missing fields
    const reply = (response.reply || '').toLowerCase();
    const missingFields = (response.missingFields || []).map(f => f.toLowerCase()).join(' ');

    if (reply.includes('product') || missingFields.includes('product')) {
      return 'create_product';
    }
    if (reply.includes('category') || missingFields.includes('category')) {
      return 'create_category';
    }
    if (reply.includes('supplier') || missingFields.includes('supplier')) {
      return 'create_supplier';
    }

    return null;
  }

  /**
   * Handle confirmation response (yes/no to create entity)
   */
  confirmCreateEntity(): void {
    this.submitMissingFieldsData();
  }

  /**
   * Cancel form and reset state
   */
  cancelMissingFieldsForm(): void {
    this.missingFieldsState = 'idle';
    this.appendAssistantMessage('Cancelled. Feel free to ask me something else!');
    this.resetMissingFieldsState();
    this.cdr.markForCheck();
  }

  // ===== Missing Fields Handler (old step-by-step - NO LONGER USED) =====
  private handleMissingFieldsResponse(message: string): void {
    // This method is kept for backward compatibility but is no longer actively used
    // The new flow uses form submission instead
    const currentField = this.missingFields[this.currentFieldIndex];
    
    if (!currentField) {
      this.replaceAssistantMessageWithError(
        this.appendAssistantLoader(),
        'Error: Invalid field state.'
      );
      this.resetMissingFieldsState();
      return;
    }

    // Store the value provided by user for this field
    this.pendingData[currentField] = message.trim();

    // Check if we have all fields
    if (this.currentFieldIndex >= this.missingFields.length - 1) {
      // All fields collected - submit to backend
      this.submitMissingFieldsData();
    } else {
      // More fields to collect
      this.currentFieldIndex++;
      const nextField = this.missingFields[this.currentFieldIndex];
      
      this.appendAssistantMessage(
        `Got it! Now please provide the ${nextField}:`
      );
    }

    this.cdr.markForCheck();
  }

  private submitMissingFieldsData(): void {
    if (!this.pendingAction) {
      this.replaceAssistantMessageWithError(
        this.appendAssistantLoader(),
        'Error: No action specified.'
      );
      this.resetMissingFieldsState();
      return;
    }

    const loaderId = this.appendAssistantLoader();
    const action = this.pendingAction;
    const data = this.pendingData;
    const entityType = this.getEntityTypeFromAction(action);

    // Determine which endpoint to use based on the extracted action
    let submitObservable$;
    
    if (
      entityType !== 'unknown' &&
      (action === 'create_product' ||
        action === 'create_category' ||
        action === 'create_supplier')
    ) {
      submitObservable$ = this.aiService.completeEntityFromAI(
        entityType as EntityType,
        data
      );
    } else {
      this.replaceAssistantMessageWithError(
        loaderId,
        `Unable to process action: ${action}`
      );
      this.resetMissingFieldsState();
      return;
    }

    submitObservable$.subscribe({
      next: (response: any) => {
        const entityTypeLabel = this.getEntityTypeLabel(action);
        const successMsg = `✅ ${entityTypeLabel} created successfully!`;
        
        this.replaceAssistantMessage(loaderId, {
          success: true,
          reply: successMsg,
          action: action,
          data: response
        });
        
        this.resetMissingFieldsState();
        this.resetImageConversationState();
        this.cdr.markForCheck();
      },
      error: (error) => {
        const entityTypeLabel = this.getEntityTypeLabel(action);
        const errorMsg = error?.error?.message || `Failed to create ${entityTypeLabel}. Please try again.`;
        
        this.replaceAssistantMessageWithError(loaderId, errorMsg);
        this.missingFieldsState = 'collecting_fields'; // Stay in state to retry
        this.currentFieldIndex = 0; // Reset to first field for retry
        
        this.cdr.markForCheck();
      }
    });
  }

  private getEntityTypeLabel(action: string): string {
    if (action.includes('product')) return 'Product';
    if (action.includes('category')) return 'Category';
    if (action.includes('supplier')) return 'Supplier';
    return 'Item';
  }

  // ===== Image Conversation State Handlers =====
  private handleEntityTypeResponse(message: string): void {
    const msgLower = message.toLowerCase().trim();

    if (msgLower.includes('product')) {
      this.pendingEntityType = 'product';
      this.imageConversationState = 'analyzing_image';
      this.analyzeImage();
    } else if (msgLower.includes('category')) {
      this.pendingEntityType = 'category';
      this.imageConversationState = 'analyzing_image';
      this.analyzeImage();
    } else if (msgLower.includes('supplier')) {
      this.pendingEntityType = 'supplier';
      this.imageConversationState = 'analyzing_image';
      this.analyzeImage();
    } else {
      this.appendAssistantMessage('I didn\'t understand. Please say: "Product", "Category", or "Supplier"');
    }
  }

  private handleConfirmationResponse(message: string): void {
    const msgLower = message.toLowerCase().trim();

    if (msgLower.includes('yes') || msgLower.includes('confirm') || msgLower === 'y') {
      this.imageConversationState = 'saving_entity';
      this.saveEntity();
    } else if (msgLower.includes('no') || msgLower === 'n') {
      this.appendAssistantMessage('Okay, cancelled. Feel free to upload another image or ask me something else!');
      this.resetImageConversationState();
    } else {
      this.appendAssistantMessage('Please answer "Yes" or "No"');
    }
  }

  // ===== Image Analysis =====
  private analyzeImage(): void {
    if (!this.pendingImageFile || !this.pendingEntityType) return;

    const loaderId = this.appendAssistantLoader();

    this.aiService.analyzeImage(this.pendingImageFile, this.pendingEntityType).subscribe({
      next: (response: AIImageAnalysisResponse) => {
        if (response.success && response.result) {
          if (this.isAiConfigurationIssue(response.result.confidenceNote)) {
            this.replaceAssistantMessageWithError(
              loaderId,
              'AI image analysis is not configured on the backend yet. Please set a valid OPENROUTER_API_KEY and restart the backend server.'
            );
            this.resetImageConversationState();
            this.cdr.markForCheck();
            return;
          }

          this.pendingExtractedData = response.result.data;
          this.pendingExtractedItems = response.result.items?.length
            ? response.result.items
            : [response.result.data];
          this.pendingConfidenceNote = response.result.confidenceNote || '';

          if (response.requiresUserInput && response.missingFields?.length) {
            this.pendingAction = `create_${this.pendingEntityType}`;
            this.pendingData = { ...response.result.data };
            this.missingFields = response.missingFields;
            this.currentFieldIndex = 0;
            this.missingFieldsState = 'collecting_fields';
            this.imageConversationState = 'idle';
            this.buildMissingFieldsForm();

            const messageParts = [
              'I found some details from the image, but a few required fields are still missing.',
              `Please fill in: ${response.missingFields.join(', ')}.`
            ];

            if (this.pendingConfidenceNote) {
              messageParts.push(`Note: ${this.pendingConfidenceNote}`);
            }

            this.replaceAssistantMessage(loaderId, {
              success: true,
              reply: messageParts.join('\n\n'),
              action: 'missing_fields',
              data: {
                fields: response.missingFields,
                totalFields: response.missingFields.length
              }
            });
            this.cdr.markForCheck();
            return;
          }

          // Replace loader with confirmation card
          this.replaceAssistantMessageWithConfirmation(loaderId, {
            ...response.result,
            confidenceNote:
              this.pendingExtractedItems.length > 1
                ? `${response.result.confidenceNote} ${this.pendingExtractedItems.length} records are ready to create.`
                : response.result.confidenceNote
          });

          this.imageConversationState = 'waiting_for_confirmation';
          this.appendAssistantMessage('Does this look correct? Say "Yes" to save or "No" to cancel.');
        } else {
          this.replaceAssistantMessageWithError(
            loaderId,
            response.message || 'Failed to analyze image. Please try again.'
          );
          this.resetImageConversationState();
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || 'Error analyzing image. Please try again.';
        this.replaceAssistantMessageWithError(loaderId, errorMsg);
        this.resetImageConversationState();
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Entity Save =====
  private saveEntity(): void {
    if (!this.pendingEntityType || !this.pendingExtractedData) return;

    const loaderId = this.appendAssistantLoader();
    const saveObservable$ = this.aiService.completeEntityFromAI(
      this.pendingEntityType,
      this.pendingExtractedItems.length > 1
        ? this.pendingExtractedItems
        : this.pendingExtractedData
    );

    saveObservable$.subscribe({
      next: (response: any) => {
        const successMsg =
          response?.message ||
          `✅ ${this.pendingEntityType || 'Item'} created successfully!`;
        this.replaceAssistantMessage(loaderId, {
          success: true,
          reply: successMsg,
          action: `create_${this.pendingEntityType}`,
          data: response
        });
        this.resetImageConversationState();
        this.cdr.markForCheck();
      },
      error: (error) => {
        const errorMsg = error?.error?.message || `Failed to save ${this.pendingEntityType}. Please try again.`;
        this.replaceAssistantMessageWithError(loaderId, errorMsg);
        this.imageConversationState = 'waiting_for_confirmation';
        this.cdr.markForCheck();
      }
    });
  }

  // ===== Message Append Helpers =====
  private appendUserMessage(text: string): void {
    this.messages.push({
      id: this.generateId(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date()
    });
    this.scrollMessagesToBottom();
    this.cdr.markForCheck();
  }

  private appendUserMessageWithImage(text: string, imageUrl: string): void {
    this.messages.push({
      id: this.generateId(),
      sender: 'user',
      text: text.trim(),
      imageUrl: imageUrl,
      timestamp: new Date()
    });
    this.scrollMessagesToBottom();
    this.cdr.markForCheck();
  }

  private appendAssistantMessage(text: string): void {
    this.messages.push({
      id: this.generateId(),
      sender: 'assistant',
      text: text,
      timestamp: new Date()
    });
    this.scrollMessagesToBottom();
    this.cdr.markForCheck();
  }

  private appendAssistantLoader(): string {
    const id = this.generateId();
    this.messages.push({
      id: id,
      sender: 'assistant',
      text: '',
      loading: true,
      timestamp: new Date()
    });
    this.scrollMessagesToBottom();
    this.cdr.markForCheck();
    return id;
  }

  private replaceAssistantMessage(id: string, response: AIChatResponse): void {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.messages[index] = {
        id: id,
        sender: 'assistant',
        text: response.reply || '',
        loading: false,
        action: response.action || 'general_chat',
        data: response.data || {},
        timestamp: new Date()
      };
    }
    this.scrollMessagesToBottom();
  }

  private replaceAssistantMessageWithConfirmation(id: string, result: any): void {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.messages[index] = {
        id: id,
        sender: 'assistant',
        text: 'I found the following details:',
        loading: false,
        confirmationDetails: {
          entityType: this.pendingEntityType || 'unknown',
          data: result.data || {},
          items: result.items || [],
          confidenceNote: result.confidenceNote || ''
        },
        timestamp: new Date()
      };
    }
    this.scrollMessagesToBottom();
  }

  private replaceAssistantMessageWithError(id: string, errorMessage: string): void {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.messages[index] = {
        id: id,
        sender: 'assistant',
        text: errorMessage,
        loading: false,
        error: true,
        timestamp: new Date()
      };
    }
    this.scrollMessagesToBottom();
  }

  // ===== Cleanup =====
  private resetImageConversationState(): void {
    this.imageConversationState = 'idle';
    this.cleanupImageData();
  }

  private resetMissingFieldsState(): void {
    this.missingFieldsState = 'idle';
    this.pendingAction = null;
    this.pendingData = {};
    this.missingFields = [];
    this.currentFieldIndex = 0;
  }

  private cleanupImageData(): void {
    if (this.pendingImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.pendingImagePreviewUrl);
    }
    this.pendingImageFile = null;
    this.pendingImagePreviewUrl = null;
    this.pendingEntityType = null;
    this.pendingExtractedData = null;
    this.pendingExtractedItems = [];
    this.pendingConfidenceNote = null;
  }

  // ===== Private Helpers =====
  private scrollMessagesToBottom(): void {
    if (this.messagesScroll?.nativeElement) {
      setTimeout(() => {
        const el = this.messagesScroll.nativeElement;
        el.scrollTop = el.scrollHeight;
      }, 0);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  trackByMessageId(_index: number, item: ChatMessage): string {
    return item.id;
  }

  getConfirmationItems(message: ChatMessage): any[] {
    const items = message.confirmationDetails?.items;

    if (Array.isArray(items) && items.length > 0) {
      return items;
    }

    return message.confirmationDetails?.data ? [message.confirmationDetails.data] : [];
  }

  getCreatedItems(message: ChatMessage): any[] {
    const createdData = message.data?.data;

    if (Array.isArray(createdData)) {
      return createdData;
    }

    return createdData ? [createdData] : [];
  }
}
