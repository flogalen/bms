/**
 * Tag Controller
 * 
 * This controller handles HTTP requests related to tags.
 */

import { Request, Response } from 'express';
import tagService from '../../services/tag.service';

export class TagController {
  /**
   * Create a new tag
   */
  async createTag(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { name, color, description } = req.body;
      
      const tag = await tagService.createTag({
        name,
        color,
        description
      });

      res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Get a tag by ID
   */
  async getTagById(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { id } = req.params;
      const tag = await tagService.getTagById(id);

      if (!tag) {
        res.status(404).json({
          success: false,
          message: `Tag with ID ${id} not found`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tag
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Get all tags with optional filtering
   */
  async getTags(req: Request, res: Response, next: Function): Promise<void> {
    try {
      // Parse query parameters
      const {
        search,
        page = '1', 
        limit = '50' 
      } = req.query;

      // Build filter object
      const filters: any = {};
      
      if (search) {
        filters.search = search as string;
      }

      // Parse pagination
      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await tagService.getTags(filters, pagination);

      res.status(200).json({
        success: true,
        data: result.tags,
        meta: {
          total: result.total,
          page: pagination.page,
          limit: pagination.limit,
          pages: Math.ceil(result.total / pagination.limit)
        }
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Update a tag
   */
  async updateTag(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;
      // Assuming tags are global, no userId check needed here. If tags were user-specific, add auth check.

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      if (description !== undefined) updateData.description = description;

      const tag = await tagService.updateTag(id, updateData);

      res.status(200).json({
        success: true,
        data: tag
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { id } = req.params;
      // Assuming tags are global, no userId check needed here. If tags were user-specific, add auth check.
      const result = await tagService.deleteTag(id);

      res.status(200).json(result);
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Get all tags for an interaction
   */
  async getTagsForInteraction(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { interactionId } = req.params;
      const tags = await tagService.getTagsForInteraction(interactionId);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Get all interactions for a tag
   */
  async getInteractionsForTag(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { tagId } = req.params;
      const {
        page = '1', 
        limit = '10' 
      } = req.query;

      // Parse pagination
      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await tagService.getInteractionsForTag(tagId, pagination);

      res.status(200).json({
        success: true,
        data: result.interactions,
        meta: {
          total: result.total,
          page: pagination.page,
          limit: pagination.limit,
          pages: Math.ceil(result.total / pagination.limit)
        }
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Associate tags with an interaction
   */
  async associateTagsWithInteraction(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { interactionId } = req.params;
      const { tagIds } = req.body;
      const userId = req.user?.id; // Get authenticated user ID

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      // TODO: AUTHORIZATION: Ensure tagService.associateTagsWithInteraction checks if userId is authorized to modify interaction 'interactionId'.
      await tagService.associateTagsWithInteraction(interactionId, tagIds, userId);

      // Get the updated tags for the interaction
      const tags = await tagService.getTagsForInteraction(interactionId); // This likely doesn't need auth check as it's read-only

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Remove tag associations from an interaction
   */
  async removeTagsFromInteraction(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const { interactionId } = req.params;
      const { tagIds } = req.body;
      const userId = req.user?.id; // Get authenticated user ID

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      // TODO: AUTHORIZATION: Ensure tagService.removeTagsFromInteraction checks if userId is authorized to modify interaction 'interactionId'.
      await tagService.removeTagsFromInteraction(interactionId, tagIds, userId);

      // Get the updated tags for the interaction
      const tags = await tagService.getTagsForInteraction(interactionId); // This likely doesn't need auth check as it's read-only

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }

  /**
   * Get the most frequently used tags
   */
  async getTopTags(req: Request, res: Response, next: Function): Promise<void> {
    try {
      // Parse limit parameter, default to 5
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      
      const tags = await tagService.getTopTags(limit);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      // Pass error to global handler
      next(error);
    }
  }
}

export default new TagController();
