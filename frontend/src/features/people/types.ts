// Enum for person status matching the backend schema
export enum PersonStatus {
  // Business contacts
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  LEAD = "LEAD",
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  PARTNER = "PARTNER",
  
  // Personal contacts
  FRIEND = "FRIEND",
  FAMILY = "FAMILY",
  ACQUAINTANCE = "ACQUAINTANCE"
}

// Type for status filter that includes "ALL" option and category filters
export type StatusFilterType = PersonStatus | "ALL" | "ACTIVE" | "LEAD" | "BUSINESS" | "PERSONAL";

// Person interface matching the backend schema
export interface Person {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  company?: string | null;
  status: PersonStatus;
  notes?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  dynamicFields?: DynamicField[];
  lastInteraction?: string | null;
}

// Dynamic field interface matching the backend schema
export interface DynamicField {
  id: string;
  fieldName: string;
  fieldType: FieldType;
  stringValue?: string | null;
  numberValue?: number | null;
  booleanValue?: boolean | null;
  dateValue?: string | null;
  createdAt: string;
  updatedAt: string;
  personId: string;
}

// Enum for field types matching the backend schema
export enum FieldType {
  STRING = "STRING",
  NUMBER = "NUMBER",
  BOOLEAN = "BOOLEAN",
  DATE = "DATE",
  URL = "URL",
  EMAIL = "EMAIL",
  PHONE = "PHONE"
}
