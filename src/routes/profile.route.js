import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { catchError } from '../utils/catchError.js';
import { profileController } from '../controllers/profile.controller.js';

export const profileRouter = new express.Router();

profileRouter.get(
  '/profile',
  authMiddleware,
  catchError(profileController.getInfoForUser),
);

profileRouter.patch(
  '/profile',
  authMiddleware,
  catchError(profileController.changeName),
);

profileRouter.post(
  '/profile/password',
  authMiddleware,
  catchError(profileController.changePassword),
);

profileRouter.post(
  '/profile/email',
  authMiddleware,
  catchError(profileController.changeEmail),
);
