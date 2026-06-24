import * as userModel from '../models/user';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/hash';
import { v4 as uuidv4 } from 'uuid';

export const register = async (data: {
  username: string;
  email: string;
  password: string;
  nickname?: string;
}): Promise<{ user: any; accessToken: string; refreshToken: string }> => {
  const existingUsername = await userModel.findByUsername(data.username);
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  const existingEmail = await userModel.findByEmail(data.email);
  if (existingEmail) {
    throw new Error('Email already exists');
  }

  const hashedPassword = await hashPassword(data.password);
  const userId = uuidv4();

  const user = await userModel.create({
    id: userId,
    username: data.username,
    email: data.email,
    password_hash: hashedPassword,
    nickname: data.nickname || data.username,
    roleNames: ['PROMPT_EDITOR'],
  });

  const tokenPayload = { id: user.id, username: user.username };
  const accessToken = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return { user, accessToken, refreshToken };
};

export const login = async (data: {
  username: string;
  password: string;
}): Promise<{ user: any; accessToken: string; refreshToken: string }> => {
  const user = await userModel.findByUsername(data.username);
  if (!user) {
    throw new Error('Invalid username or password');
  }

  if (user.status === 0) {
    throw new Error('Account has been disabled');
  }

  const isValid = await comparePassword(data.password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  await userModel.updateLastLogin(user.id);

  const { password_hash, ...userWithoutPassword } = user;
  const tokenPayload = { id: user.id, username: user.username };
  const accessToken = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const refreshToken = async (token: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const decoded = verifyToken(token);
  if (!decoded) {
    throw new Error('Invalid or expired refresh token');
  }

  const user = await userModel.findById(decoded.id);
  if (!user) {
    throw new Error('User not found');
  }

  const tokenPayload = { id: user.id, username: user.username };
  const newAccessToken = generateToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const getProfile = async (userId: string): Promise<any> => {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  const { password_hash, ...rest } = user;
  return rest;
};

export const updateProfile = async (userId: string, data: { nickname?: string; avatar?: string }): Promise<any> => {
  const user = await userModel.update(userId, data);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const changePassword = async (userId: string, oldPassword: string, newPassword: string): Promise<void> => {
  const user = await userModel.findByIdWithPassword(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await comparePassword(oldPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  const hashedNewPassword = await hashPassword(newPassword);
  await userModel.update(userId, { password_hash: hashedNewPassword });
};
