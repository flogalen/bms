/**
 * Tag Routes
 * 
 * This file defines the routes for tags.
 */

import { Router } from 'express';
import tagController from '../controllers/tag/tag.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all tag routes
router.use(authenticateJWT);

// Tag routes
router.post('/', tagController.createTag);
router.get('/', tagController.getTags);
router.get('/top', tagController.getTopTags); // Get top tags by usage
router.get('/:id', tagController.getTagById);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Tag-Interaction relationship routes
router.get('/interaction/:interactionId', tagController.getTagsForInteraction);
router.get('/:tagId/interactions', tagController.getInteractionsForTag);
router.post('/interaction/:interactionId', tagController.associateTagsWithInteraction);
router.delete('/interaction/:interactionId', tagController.removeTagsFromInteraction);


export default router;
