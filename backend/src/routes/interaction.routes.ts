/**
 * Interaction Routes
 * 
 * This file defines the routes for interaction logs.
 */

import { Router } from 'express';
import interactionController from '../controllers/interaction/interaction.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Apply authentication middleware to all interaction routes
router.use(authenticateJWT);

// Interaction routes
router.post('/', interactionController.createInteraction);
router.get('/', interactionController.getInteractions);
router.get('/tags', interactionController.getAllTags);
router.get('/:id', interactionController.getInteractionById);
router.put('/:id', interactionController.updateInteraction);
router.delete('/:id', interactionController.deleteInteraction);
router.post('/:id/tags', interactionController.addTagsById);
router.delete('/:id/tags', interactionController.removeTagsById);

// Person-specific interaction routes
router.get('/person/:personId', interactionController.getInteractionsByPerson);

export default router;
