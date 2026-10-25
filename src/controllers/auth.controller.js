import { User } from '../models/user.js';
import { userService } from '../services/user.service.js';
import { jwtService } from '../services/jwt.service.js';
import { ApiError } from '../exception/api.error.js';
import bcrypt from 'bcrypt';
import { tokenService } from '../services/token.service.js';
import { emailService } from '../services/email.service.js';
import { v4 as uuidv4 } from 'uuid';

const EMAIL_PATTERN = /^[\w.+-]+@([\w-]+\.){1,3}[\w-]{2,}$/;

export function validateEmail(value) {
  if (!value) {
    return 'Email is required';
  }

  if (!EMAIL_PATTERN.test(value)) {
    return 'Email is not valid';
  }
}

export function validatePassword(value) {
  if (!value) {
    return 'Password is required';
  }

  if (value.length < 6) {
    return 'At least 6 characters';
  }
}

const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  const errors = {
    email: validateEmail(email),
    password: validatePassword(password),
  };

  if (errors.email || errors.password) {
    throw ApiError.badRequest('Bad request', errors);
  }

  const hashedPass = await bcrypt.hash(password, 10);

  await userService.register(name, email, hashedPass);
  res.send({ message: 'OK' });
};

const activate = async (req, res) => {
  const { activationToken } = req.params;

  const user = await User.findOne({
    where: { activationToken },
  });

  // || user.activationToken !== activationToken
  if (!user) {
    throw ApiError.notFound('No such user');
  }

  user.activationToken = null;
  await user.save();

  res.send({
    redirectTo: '/profile',
    user: userService.normalize(user),
  });
};

async function generateTokens(res, user) {
  const normalizedUser = userService.normalize(user);

  const accessToken = jwtService.sign(normalizedUser);
  const refreshAccessToken = jwtService.signRefresh(normalizedUser);

  await tokenService.save(normalizedUser.id, refreshAccessToken);

  res.cookie('refreshToken', refreshAccessToken, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    HttpOnly: true,
  });

  res.send({
    user: normalizedUser,
    accessToken,
  });
}

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await userService.findByEmail(email);

  if (!user) {
    throw ApiError.notFound('No such user');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw ApiError.badRequest('Wrong password');
  }

  if (user.activationToken) {
    throw ApiError.badRequest('User is not active');
  }

  await generateTokens(res, user);
};

const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;

  const userData = await jwtService.verifyRefresh(refreshToken);
  const token = await tokenService.getByToken(refreshToken);

  if (!userData || !token) {
    throw ApiError.unauthorized();
  }

  const user = await userService.findByEmail(userData.email);

  await generateTokens(res, user);
};

const logout = async (req, res) => {
  const { refreshToken } = req.cookies;

  const userData = await jwtService.verifyRefresh(refreshToken);

  if (!userData || !refreshToken) {
    throw ApiError.unauthorized();
  }

  await tokenService.remove(userData.id);
  res.sendStatus(204);
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const forgotToken = uuidv4();

  const user = await userService.findByEmail(email);

  if (!user) {
    throw ApiError.badRequest('No such user');
  }

  user.resetPasswordToken = forgotToken;
  await user.save();
  await emailService.sendResetPassword(email, forgotToken);
  res.sendStatus(204);
};

const resetPassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { token } = req.params;

  const user = await User.findOne({
    where: { resetPasswordToken: token },
  });

  const errors = {
    password: validatePassword(password),
  };

  if (errors.password) {
    throw ApiError.badRequest('Bad request', errors);
  }

  if (!user) {
    throw ApiError.badRequest('User no token');
  }

  if (password !== confirmPassword) {
    throw ApiError.badRequest('Password not match');
  }

  const hashedPass = await bcrypt.hash(password, 10);

  user.resetPasswordToken = null;
  user.password = hashedPass;
  await user.save();

  res.send({ message: 'OK' });
};

export const authController = {
  register,
  activate,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
