/**
 * Tag Service
 * 
 * This service handles business logic for Tag entities.
 * It enables creating, updating, and managing tags for interactions.
 */

import { Prisma } from "@prisma/client";
import prisma from "../prisma";

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Define interfaces for our service methods
export interface CreateTagInput {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
  description?: string;
}

export interface TagFilter {
  search?: string;
}

export interface TagServiceError extends Error {
  code?: string;
}

export class TagService {
  /**
   * Create a new tag
   */
  async createTag(data: CreateTagInput): Promise<Tag> {
    try {
      // Validate required fields
      this.validateTagData(data);

      // Create the tag
      const tag = await prisma.tag.create({
        data: {
          name: data.name,
          color: data.color,
          description: data.description
        }
      });

      return tag;
    } catch (error) {
      this.handleError(error as Error, "Error creating tag");
    }
  }

  /**
   * Get a tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id }
      });

      return tag;
    } catch (error) {
      this.handleError(error as Error, "Error fetching tag");
    }
  }

  /**
   * Get a tag by name
   */
  async getTagByName(name: string): Promise<Tag | null> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { name }
      });

      return tag;
    } catch (error) {
      this.handleError(error as Error, "Error fetching tag by name");
    }
  }

  /**
   * Get all tags with optional filtering
   */
  async getTags(
    filters?: TagFilter,
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ tags: Tag[]; total: number }> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50; // Default to a higher limit for tags
      const skip = (page - 1) * limit;

      // Build the where clause based on filters
      let where: any = {};

      // Search by name or description
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      // Get total count for pagination
      const total = await prisma.tag.count({ where });

      // Get tags with pagination
      const tags = await prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      });

      return { tags, total };
    } catch (error) {
      this.handleError(error as Error, "Error fetching tags");
    }
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, data: UpdateTagInput): Promise<Tag> {
    try {
      // Check if tag exists
      const existingTag = await prisma.tag.findUnique({
        where: { id }
      });

      if (!existingTag) {
        throw new Error(`Tag with ID ${id} not found`);
      }

      // Update the tag
      const updatedTag = await prisma.tag.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      return updatedTag;
    } catch (error) {
      this.handleError(error as Error, "Error updating tag");
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if tag exists
      const existingTag = await prisma.tag.findUnique({
        where: { id }
      });

      if (!existingTag) {
        throw new Error(`Tag with ID ${id} not found`);
      }

      // Delete the tag
      await prisma.tag.delete({
        where: { id }
      });

      return { success: true, message: "Tag deleted successfully" };
    } catch (error) {
      this.handleError(error as Error, "Error deleting tag");
    }
  }

  /**
   * Associate tags with an interaction
   */
  async associateTagsWithInteraction(interactionId: string, tagIds: string[], userId?: string): Promise<void> {
    try {
      // Check if interaction exists
      const interaction = await prisma.interactionLog.findUnique({
        where: { id: interactionId }
      });

      if (!interaction) {
        throw new Error(`Interaction with ID ${interactionId} not found`);
      }

      // Authorization check: Ensure the user owns the interaction record
      if (!userId || interaction.createdById !== userId) {
        throw new Error("Unauthorized: You do not have permission to modify tags for this interaction.");
      }

      // Create the associations
      await Promise.all(
        tagIds.map(tagId =>
          prisma.interactionTag.create({
            data: {
              interactionId,
              tagId
            }
          })
        )
      );
    } catch (error) {
      this.handleError(error as Error, "Error associating tags with interaction");
    }
  }

  /**
   * Remove tag associations from an interaction
   */
  async removeTagsFromInteraction(interactionId: string, tagIds: string[], userId?: string): Promise<void> {
    try {
      // Check if interaction exists
      const interaction = await prisma.interactionLog.findUnique({
        where: { id: interactionId }
      });

      if (!interaction) {
        throw new Error(`Interaction with ID ${interactionId} not found`);
      }

      // Authorization check: Ensure the user owns the interaction record
      if (!userId || interaction.createdById !== userId) {
        throw new Error("Unauthorized: You do not have permission to modify tags for this interaction.");
      }

      // Delete the associations
      await prisma.interactionTag.deleteMany({
        where: {
          interactionId,
          tagId: {
            in: tagIds
          }
        }
      });
    } catch (error) {
      this.handleError(error as Error, "Error removing tags from interaction");
    }
  }

  /**
   * Get all tags for an interaction
   */
  async getTagsForInteraction(interactionId: string): Promise<Tag[]> {
    try {
      // Check if interaction exists
      const interaction = await prisma.interactionLog.findUnique({
        where: { id: interactionId }
      });

      if (!interaction) {
        throw new Error(`Interaction with ID ${interactionId} not found`);
      }

      // Get the tags
      const tagRelations = await prisma.interactionTag.findMany({
        where: { interactionId },
        include: { tag: true }
      });

      return tagRelations.map((relation: { tag: Tag }) => relation.tag);
    } catch (error) {
      this.handleError(error as Error, "Error fetching tags for interaction");
    }
  }

  /**
   * Get the most frequently used tags
   */
  async getTopTags(limit: number = 5): Promise<Tag[]> {
    try {
      // Get tags with their usage count
      const tagCounts = await prisma.interactionTag.groupBy({
        by: ['tagId'],
        _count: {
          tagId: true
        }
      });

      // Sort by count in descending order and take the top 'limit' tags
      const topTagIds = tagCounts
        .sort((a, b) => b._count.tagId - a._count.tagId)
        .slice(0, limit)
        .map(tag => tag.tagId);

      // If no tags have been used yet, return an empty array
      if (topTagIds.length === 0) {
        return [];
      }

      // Fetch the actual tag objects
      const topTags = await prisma.tag.findMany({
        where: {
          id: {
            in: topTagIds
          }
        }
      });

      // Sort the tags in the same order as topTagIds
      return topTagIds.map(id => 
        topTags.find(tag => tag.id === id)
      ).filter(tag => tag !== undefined) as Tag[];
    } catch (error) {
      this.handleError(error as Error, "Error fetching top tags");
    }
  }

  /**
   * Get all interactions for a tag
   */
  async getInteractionsForTag(
    tagId: string,
    pagination?: {
      page?: number;
      limit?: number;
    }
  ): Promise<{ interactions: any[]; total: number }> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Check if tag exists
      const tag = await prisma.tag.findUnique({
        where: { id: tagId }
      });

      if (!tag) {
        throw new Error(`Tag with ID ${tagId} not found`);
      }

      // Get total count
      const total = await prisma.interactionTag.count({
        where: { tagId }
      });

      // Get the interactions
      const interactionRelations = await prisma.interactionTag.findMany({
        where: { tagId },
        include: {
          interaction: {
            include: {
              person: true,
              createdBy: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          interaction: {
            date: 'desc'
          }
        }
      });

      return {
        interactions: interactionRelations.map((relation: { interaction: any }) => relation.interaction),
        total
      };
    } catch (error) {
      this.handleError(error as Error, "Error fetching interactions for tag");
    }
  }


  /**
   * Validate that a tag has all required fields
   */
  private validateTagData(data: CreateTagInput | UpdateTagInput): void {
    // For create operations, name is required
    if ('name' in data && !data.name) {
      throw new Error("Tag name is required");
    }

    // Validate color if provided (should be a valid hex color or CSS color name)
    if (data.color && !this.isValidColor(data.color)) {
      throw new Error("Invalid color format. Use hex code (e.g., #FF5733) or CSS color name");
    }
  }

  /**
   * Check if a string is a valid color
   */
  private isValidColor(color: string): boolean {
    // Simple validation for hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    // List of valid CSS color names
    const cssColorNames = [
      'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
      'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
      'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
      'darkgoldenrod', 'darkgray', 'darkgreen', 'darkkhaki', 'darkmagenta', 'darkolivegreen',
      'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
      'darkslategray', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray',
      'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite',
      'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'honeydew', 'hotpink', 'indianred',
      'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
      'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen',
      'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray', 'lightsteelblue',
      'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
      'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
      'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
      'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
      'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
      'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
      'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
      'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'snow', 'springgreen', 'steelblue',
      'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke',
      'yellow', 'yellowgreen'
    ];

    return hexColorRegex.test(color) || cssColorNames.includes(color.toLowerCase());
  }

  /**
   * Handle errors in a consistent way
   */
  private handleError(error: Error, message: string): never {
    console.error(`${message}:`, error);
    
    // Create a custom error with additional context
    const serviceError: TagServiceError = new Error(
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

export default new TagService();
