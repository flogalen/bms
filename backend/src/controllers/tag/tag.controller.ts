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
  async createTag(req: Request, res: Response): Promise<void> {
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
      console.error('Error creating tag:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to create tag'
      });
    }
  }

  /**
   * Get a tag by ID
   */
  async getTagById(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching tag:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch tag'
      });
    }
  }

  /**
   * Get all tags with optional filtering
   */
  async getTags(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching tags:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch tags'
      });
    }
  }

  /**
   * Update a tag
   */
  async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;

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
      console.error('Error updating tag:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to update tag'
      });
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await tagService.deleteTag(id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting tag:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to delete tag'
      });
    }
  }

  /**
   * Get all tags for an interaction
   */
  async getTagsForInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { interactionId } = req.params;
      const tags = await tagService.getTagsForInteraction(interactionId);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error fetching tags for interaction:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch tags for interaction'
      });
    }
  }

  /**
   * Get all interactions for a tag
   */
  async getInteractionsForTag(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching interactions for tag:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch interactions for tag'
      });
    }
  }

  /**
   * Associate tags with an interaction
   */
  async associateTagsWithInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { interactionId } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      await tagService.associateTagsWithInteraction(interactionId, tagIds);

      // Get the updated tags for the interaction
      const tags = await tagService.getTagsForInteraction(interactionId);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error associating tags with interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to associate tags with interaction'
      });
    }
  }

  /**
   * Remove tag associations from an interaction
   */
  async removeTagsFromInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { interactionId } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      await tagService.removeTagsFromInteraction(interactionId, tagIds);

      // Get the updated tags for the interaction
      const tags = await tagService.getTagsForInteraction(interactionId);

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error removing tags from interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to remove tags from interaction'
      });
    }
  }

}

export default new TagController();
