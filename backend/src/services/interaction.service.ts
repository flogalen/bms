/**
 * Interaction Service
 * 
 * This service handles business logic for InteractionLog entities.
 * It enables recording and retrieving all types of interactions with people.
 * 
 * IMPORTANT: After updating the schema, make sure to regenerate the Prisma client
 * by running: npm run prisma:generate
 */

import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import tagService from "./tag.service";

// Define our own enum to match the schema
export enum InteractionType {
  CALL = "CALL",
  EMAIL = "EMAIL",
  MEETING = "MEETING",
  NOTE = "NOTE",
  TASK = "TASK",
  OTHER = "OTHER"
}

export interface InteractionLog {
  id: string;
  type: InteractionType;
  notes?: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  personId: string;
  createdById?: string | null;
  person?: any; // We don't need the full Person type in this service
  structuredTags?: any[]; // Tags from the Tag model
}

// Define a type that extends PrismaClient with our models
// This is a workaround until the Prisma client is regenerated
interface ExtendedPrismaClient extends PrismaClient {
  interactionLog: any;
  interactionTag: any;
  tag: any;
}

// Use a singleton pattern for PrismaClient to make it easier to mock in tests
let prisma: ExtendedPrismaClient;

// Check if we're in a test environment
if (process.env.NODE_ENV === 'test') {
  // In test environment, prisma will be mocked by the test
  prisma = (global as any).prisma as ExtendedPrismaClient;
} else {
  // In production/development, create a new instance
  prisma = new PrismaClient() as ExtendedPrismaClient;
}

// Define interfaces for our service methods
export interface CreateInteractionInput {
  type: InteractionType;
  notes?: string;
  date?: Date;
  tagIds?: string[];
  personId: string;
  createdById?: string;
}

export interface UpdateInteractionInput {
  type?: InteractionType;
  notes?: string;
  date?: Date;
  tagIds?: string[];
}

export interface InteractionFilter {
  personId?: string;
  type?: InteractionType;
  startDate?: Date;
  endDate?: Date;
  tagIds?: string[];
}

export interface InteractionServiceError extends Error {
  code?: string;
}

export class InteractionService {
  /**
   * Create a new interaction log
   */
  async createInteraction(data: CreateInteractionInput): Promise<InteractionLog> {
    try {
      // Validate required fields
      this.validateInteractionData(data);

      // Create the interaction log
      const interaction = await prisma.interactionLog.create({
        data: {
          type: data.type,
          notes: data.notes,
          date: data.date || new Date(),
          person: {
            connect: { id: data.personId }
          },
          ...(data.createdById ? {
            createdBy: {
              connect: { id: data.createdById }
            }
          } : {})
        },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });

      // If tagIds were provided, associate them with the interaction
      if (data.tagIds && data.tagIds.length > 0) {
        await tagService.associateTagsWithInteraction(interaction.id, data.tagIds);
      }

      return interaction;
    } catch (error) {
      this.handleError(error as Error, "Error creating interaction log");
    }
  }

  /**
   * Get an interaction log by ID
   */
  async getInteractionById(id: string): Promise<InteractionLog | null> {
    try {
      const interaction = await prisma.interactionLog.findUnique({
        where: { id },
        include: {
          person: true,
          createdBy: true
        }
      });

      return interaction;
    } catch (error) {
      this.handleError(error as Error, "Error fetching interaction log");
    }
  }

  /**
   * Get all interaction logs with optional filtering
   */
  async getInteractions(
    filters?: InteractionFilter,
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ interactions: InteractionLog[]; total: number }> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Build the where clause based on filters
      let where: any = {};

      if (filters?.personId) {
        where.personId = filters.personId;
      }

      if (filters?.type) {
        where.type = filters.type;
      }

      // Date range filtering
      if (filters?.startDate || filters?.endDate) {
        where.date = {};
        
        if (filters?.startDate) {
          where.date.gte = filters.startDate;
        }
        
        if (filters?.endDate) {
          where.date.lte = filters.endDate;
        }
      }

      // Tag ID filtering - find interactions that have ALL the specified tag IDs
      if (filters?.tagIds && filters.tagIds.length > 0) {
        where.tagRelations = {
          some: {
            tagId: {
              in: filters.tagIds
            }
          }
        };
      }

      // Get total count for pagination
      const total = await prisma.interactionLog.count({ where });

      // Get interactions with pagination
      const interactions = await prisma.interactionLog.findMany({
        where,
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          date: 'desc'
        }
      });

      // Transform the interactions to include a structured tags array
      const transformedInteractions = interactions.map((interaction: any) => {
        const structuredTags = interaction.tagRelations ? interaction.tagRelations.map((relation: any) => ({
          id: relation.tag.id,
          name: relation.tag.name,
          color: relation.tag.color,
          description: relation.tag.description
        })) : [];

        return {
          ...interaction,
          structuredTags
        };
      });

      return { interactions: transformedInteractions, total };
    } catch (error) {
      this.handleError(error as Error, "Error fetching interaction logs");
    }
  }

  /**
   * Get interactions for a specific person
   */
  async getInteractionsByPerson(
    personId: string,
    filters?: Omit<InteractionFilter, 'personId'>,
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ interactions: InteractionLog[]; total: number }> {
    return this.getInteractions(
      { ...filters, personId },
      pagination
    );
  }

  /**
   * Update an interaction log
   */
  async updateInteraction(id: string, data: UpdateInteractionInput): Promise<InteractionLog> {
    try {
      // Check if interaction exists
      const existingInteraction = await prisma.interactionLog.findUnique({
        where: { id }
      });

      if (!existingInteraction) {
        throw new Error(`Interaction log with ID ${id} not found`);
      }

      // Update the interaction
      const updatedInteraction = await prisma.interactionLog.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });

      // If tagIds were updated, update the tag associations
      if (data.tagIds) {
        // First, remove all existing tag associations
        await prisma.interactionTag.deleteMany({
          where: { interactionId: id }
        });
        
        // Then, create new associations
        if (data.tagIds.length > 0) {
          await tagService.associateTagsWithInteraction(id, data.tagIds);
        }
      }

      // Get the updated interaction with structured tags
      const interaction = await prisma.interactionLog.findUnique({
        where: { id },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });

      if (!interaction) {
        throw new Error(`Interaction log with ID ${id} not found after update`);
      }

      // Transform the interaction to include a structured tags array
      const structuredTags = interaction.tagRelations ? interaction.tagRelations.map((relation: any) => ({
        id: relation.tag.id,
        name: relation.tag.name,
        color: relation.tag.color,
        description: relation.tag.description
      })) : [];

      return {
        ...interaction,
        structuredTags
      };
    } catch (error) {
      this.handleError(error as Error, "Error updating interaction log");
    }
  }

  /**
   * Delete an interaction log
   */
  async deleteInteraction(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if interaction exists
      const existingInteraction = await prisma.interactionLog.findUnique({
        where: { id }
      });

      if (!existingInteraction) {
        throw new Error(`Interaction log with ID ${id} not found`);
      }

      // Delete the interaction
      await prisma.interactionLog.delete({
        where: { id }
      });

      return { success: true, message: "Interaction log deleted successfully" };
    } catch (error) {
      this.handleError(error as Error, "Error deleting interaction log");
    }
  }

  /**
   * Add tags to an interaction log by tag IDs
   */
  async addTagsById(id: string, tagIds: string[]): Promise<InteractionLog> {
    try {
      // Check if interaction exists
      const existingInteraction = await prisma.interactionLog.findUnique({
        where: { id }
      });

      if (!existingInteraction) {
        throw new Error(`Interaction log with ID ${id} not found`);
      }

      // Associate tags with interaction
      await tagService.associateTagsWithInteraction(id, tagIds);

      // Get the updated interaction with structured tags
      const interaction = await prisma.interactionLog.findUnique({
        where: { id },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });

      if (!interaction) {
        throw new Error(`Interaction log with ID ${id} not found after update`);
      }

      // Transform the interaction to include a structured tags array
      const structuredTags = interaction.tagRelations ? interaction.tagRelations.map((relation: any) => ({
        id: relation.tag.id,
        name: relation.tag.name,
        color: relation.tag.color,
        description: relation.tag.description
      })) : [];

      return {
        ...interaction,
        structuredTags
      };
    } catch (error) {
      this.handleError(error as Error, "Error adding tags to interaction log");
    }
  }

  /**
   * Remove tags from an interaction log by tag IDs
   */
  async removeTagsById(id: string, tagIds: string[]): Promise<InteractionLog> {
    try {
      // Check if interaction exists
      const existingInteraction = await prisma.interactionLog.findUnique({
        where: { id }
      });

      if (!existingInteraction) {
        throw new Error(`Interaction log with ID ${id} not found`);
      }

      // Remove tag associations
      await tagService.removeTagsFromInteraction(id, tagIds);

      // Get the updated interaction with structured tags
      const interaction = await prisma.interactionLog.findUnique({
        where: { id },
        include: {
          person: true,
          createdBy: true,
          tagRelations: {
            include: {
              tag: true
            }
          }
        }
      });

      if (!interaction) {
        throw new Error(`Interaction log with ID ${id} not found after update`);
      }

      // Transform the interaction to include a structured tags array
      const structuredTags = interaction.tagRelations ? interaction.tagRelations.map((relation: any) => ({
        id: relation.tag.id,
        name: relation.tag.name,
        color: relation.tag.color,
        description: relation.tag.description
      })) : [];

      return {
        ...interaction,
        structuredTags
      };
    } catch (error) {
      this.handleError(error as Error, "Error removing tags from interaction log");
    }
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<any[]> {
    try {
      // Get all tag entities
      const { tags } = await tagService.getTags();
      
      // Return structured tags
      return tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description
      })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      this.handleError(error as Error, "Error fetching all tags");
    }
  }

  /**
   * Validate that an interaction has all required fields
   */
  private validateInteractionData(data: CreateInteractionInput | UpdateInteractionInput): void {
    // For create operations, type and personId are required
    if ('type' in data && !data.type) {
      throw new Error("Interaction type is required");
    }

    if ('personId' in data && !data.personId) {
      throw new Error("Person ID is required");
    }

    // Validate date if provided
    if (data.date && !(data.date instanceof Date) && isNaN(new Date(data.date).getTime())) {
      throw new Error("Invalid date format");
    }

    // Validate tagIds if provided
    if (data.tagIds) {
      if (!Array.isArray(data.tagIds)) {
        throw new Error("tagIds must be an array of strings");
      }
      
      // Check that all tagIds are strings
      if (data.tagIds.some(tagId => typeof tagId !== 'string')) {
        throw new Error("All tagIds must be strings");
      }
    }
  }

  /**
   * Handle errors in a consistent way
   */
  private handleError(error: Error, message: string): never {
    console.error(`${message}:`, error);
    
    // Create a custom error with additional context
    const serviceError: InteractionServiceError = new Error(
      error.message || message
    );
    
    // If it's a Prisma error, add the code
    // Check if Prisma.PrismaClientKnownRequestError exists to avoid errors in tests
    if (Prisma && 
        typeof Prisma === 'object' && 
        'PrismaClientKnownRequestError' in Prisma && 
        error instanceof Prisma.PrismaClientKnownRequestError) {
      serviceError.code = error.code;
    }
    
    throw serviceError;
  }
}

export default new InteractionService();
