/**
 * Kitchen Model
 * TypeScript interfaces for kitchen items and meal orders
 */

export interface KitchenItem {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  vatCode: 'VAT_15' | 'VAT_25';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MealOrder {
  id: string;
  reservationId?: string;
  bookingGroupId?: string;
  kitchenItemId: string;
  orderDateTime: Date;
  quantity: number;
  servingLocation: string;
  referenceText?: string;
  notes?: string;
  status: 'PLANNED' | 'IN_PREP' | 'READY' | 'DELIVERED' | 'CANCELLED';
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KitchenItemCreateInput {
  name: string;
  description?: string;
  unitPrice: number;
  vatCode: 'VAT_15' | 'VAT_25';
  isActive?: boolean;
}

export interface KitchenItemUpdateInput {
  name?: string;
  description?: string;
  unitPrice?: number;
  vatCode?: 'VAT_15' | 'VAT_25';
  isActive?: boolean;
}

export interface MealOrderCreateInput {
  reservationId?: string;
  bookingGroupId?: string;
  kitchenItemId: string;
  orderDateTime: string; // ISO timestamp
  quantity: number;
  servingLocation: string;
  referenceText?: string;
  notes?: string;
}

export interface MealOrderUpdateInput {
  servingLocation?: string;
  referenceText?: string;
  notes?: string;
}

export interface MealOrderStatusUpdateInput {
  status: 'PLANNED' | 'IN_PREP' | 'READY' | 'DELIVERED' | 'CANCELLED';
}

export interface KitchenBoardItem {
  orderDateTime: string;
  itemName: string;
  quantity: number;
  location: string;
  referenceText?: string;
  notes?: string;
  status: string;
  orderId: string;
}

