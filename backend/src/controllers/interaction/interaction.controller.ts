/**
 * Interaction Controller
 * 
 * This controller handles HTTP requests related to interaction logs.
 */

import { Request, Response } from 'express';
import interactionService, { InteractionType } from '../../services/interaction.service';
import tagService from '../../services/tag.service';

export class InteractionController {
  /**
   * Create a new interaction log
   */
  async createInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { type, notes, date, tagIds, personId } = req.body;
      
      // Get the user ID from the authenticated user
      const createdById = req.user?.id;

      const interaction = await interactionService.createInteraction({
        type,
        notes,
        date: date ? new Date(date) : undefined,
        tagIds,
        personId,
        createdById
      });

      res.status(201).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      console.error('Error creating interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to create interaction'
      });
    }
  }

  /**
   * Get an interaction log by ID
   */
  async getInteractionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const interaction = await interactionService.getInteractionById(id);

      if (!interaction) {
        res.status(404).json({
          success: false,
          message: `Interaction with ID ${id} not found`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      console.error('Error fetching interaction:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch interaction'
      });
    }
  }

  /**
   * Get all interaction logs with optional filtering
   */
  async getInteractions(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters
      const { 
        personId, 
        type, 
        startDate, 
        endDate, 
        tagIds,
        page = '1', 
        limit = '10' 
      } = req.query;

      // Build filter object
      const filters: any = {};
      
      if (personId) {
        filters.personId = personId as string;
      }
      
      if (type) {
        filters.type = type as InteractionType;
      }
      
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      

      if (tagIds) {
        // Parse tag IDs from comma-separated string
        filters.tagIds = (tagIds as string).split(',');
      }

      // Parse pagination
      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await interactionService.getInteractions(filters, pagination);

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
      console.error('Error fetching interactions:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch interactions'
      });
    }
  }

  /**
   * Get interactions for a specific person
   */
  async getInteractionsByPerson(req: Request, res: Response): Promise<void> {
    try {
      const { personId } = req.params;
      const { 
        type, 
        startDate, 
        endDate, 
        tagIds,
        page = '1', 
        limit = '10' 
      } = req.query;

      // Build filter object
      const filters: any = {};
      
      if (type) {
        filters.type = type as InteractionType;
      }
      
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      

      if (tagIds) {
        // Parse tag IDs from comma-separated string
        filters.tagIds = (tagIds as string).split(',');
      }

      // Parse pagination
      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await interactionService.getInteractionsByPerson(
        personId,
        filters,
        pagination
      );

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
      console.error('Error fetching interactions for person:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch interactions'
      });
    }
  }

  /**
   * Update an interaction log
   */
  async updateInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, notes, date, tagIds } = req.body;

      const updateData: any = {};
      
      if (type !== undefined) updateData.type = type;
      if (notes !== undefined) updateData.notes = notes;
      if (date !== undefined) updateData.date = new Date(date);
      if (tagIds !== undefined) updateData.tagIds = tagIds;

      const interaction = await interactionService.updateInteraction(id, updateData);

      res.status(200).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      console.error('Error updating interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to update interaction'
      });
    }
  }

  /**
   * Delete an interaction log
   */
  async deleteInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await interactionService.deleteInteraction(id);

      res.status(200).json(result);
    } catch (error) {
      console.error('Error deleting interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to delete interaction'
      });
    }
  }

  /**
   * Add tags to an interaction log by tag IDs
   */
  async addTagsById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      const interaction = await interactionService.addTagsById(id, tagIds);

      res.status(200).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      console.error('Error adding tags to interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to add tags'
      });
    }
  }

  /**
   * Remove tags from an interaction log by tag IDs
   */
  async removeTagsById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tagIds } = req.body;

      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          message: 'tagIds must be an array of tag IDs'
        });
        return;
      }

      const interaction = await interactionService.removeTagsById(id, tagIds);

      res.status(200).json({
        success: true,
        data: interaction
      });
    } catch (error) {
      console.error('Error removing tags from interaction:', error);
      res.status(400).json({
        success: false,
        message: (error as Error).message || 'Failed to remove tags'
      });
    }
  }

  /**
   * Get all unique tags used across interaction logs
   */
  async getAllTags(req: Request, res: Response): Promise<void> {
    try {
      const tags = await interactionService.getAllTags();

      res.status(200).json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error fetching all tags:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to fetch tags'
      });
    }
  }
}

export default new InteractionController();
