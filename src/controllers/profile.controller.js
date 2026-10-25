import { ApiError } from '../exception/api.error.js';
import { User } from '../models/user.js';
import { userService } from '../services/user.service.js';
import bcrypt from 'bcrypt';
import { validatePassword } from './auth.controller.js';
import { emailService } from '../services/email.service.js';

const getInfoForUser = async (req, res) => {
  const { email } = req.user;
  const user = await userService.findByEmail(email);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  res.send(userService.normalize(user));
};

const changeName = async (req, res) => {
  const { id } = req.user;
  const { name } = req.body;

  const user = await User.findByPk(id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.name = name;
  await user.save();
  res.send({ message: 'OK' });
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const { id } = req.user;
  const user = await User.findByPk(id);

  if (!user) {
    throw ApiError.notFound('No such user');
  }

  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('Password not equal');
  }

  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isOldPasswordValid) {
    throw ApiError.badRequest('Wrong password');
  }

  const errors = {
    password: validatePassword(newPassword),
  };

  if (errors.password) {
    throw ApiError.badRequest('Bad request', errors);
  }

  const hashedPass = await bcrypt.hash(newPassword, 10);

  user.password = hashedPass;
  await user.save();
  res.send({ message: 'OK' });
};

const changeEmail = async (req, res) => {
  const { password, newEmail } = req.body;
  const { id } = req.user;
  const user = await User.findByPk(id);

  if (!user) {
    throw ApiError.notFound('No such user');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw ApiError.badRequest('Wrong password');
  }

  const matchEmail = await User.findOne({
    where: { email: newEmail },
  });

  if (matchEmail) {
    throw ApiError.badRequest('This email is busy');
  }

  await emailService.sendNotificationOnOldEmail(user.email);
  user.email = newEmail;
  await user.save();
  res.send({ message: 'OK' });
};

export const profileController = {
  getInfoForUser,
  changeName,
  changePassword,
  changeEmail,
};
