import { Router } from "express";
import * as personController from "../controllers/person/person.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

// All person routes require authentication
router.use(authenticateJWT);

// Person CRUD routes
router.get("/", async (req, res, next) => {
  try {
    await personController.getPeople(req, res);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    await personController.getPersonById(req, res);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    await personController.createPerson(req, res);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    await personController.updatePerson(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await personController.deletePerson(req, res);
  } catch (error) {
    next(error);
  }
});

// Dynamic fields routes
router.post("/:personId/fields", async (req, res, next) => {
  try {
    await personController.addDynamicField(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete("/fields/:fieldId", async (req, res, next) => {
  try {
    await personController.removeDynamicField(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
