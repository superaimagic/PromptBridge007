import * as authService from '../services/authService';
import { success, error } from '../utils/response';

export const register = async (ctx: any) => {
  try {
    const { username, email, password, nickname } = ctx.request.body;
    const result = await authService.register({ username, email, password, nickname });
    success(ctx, result, 'Registration successful');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const login = async (ctx: any) => {
  try {
    const { username, password } = ctx.request.body;
    const result = await authService.login({ username, password });
    success(ctx, result, 'Login successful');
  } catch (err: any) {
    error(ctx, 401, err.message);
  }
};

export const refreshToken = async (ctx: any) => {
  try {
    const { refreshToken: token } = ctx.request.body;
    const result = await authService.refreshToken(token);
    success(ctx, result, 'Token refreshed');
  } catch (err: any) {
    error(ctx, 401, err.message);
  }
};

export const me = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const user = await authService.getProfile(userId);
    success(ctx, user);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const updateProfile = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const { nickname, avatar } = ctx.request.body;
    const user = await authService.updateProfile(userId, { nickname, avatar });
    success(ctx, user, 'Profile updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const changePassword = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const { oldPassword, newPassword } = ctx.request.body;
    await authService.changePassword(userId, oldPassword, newPassword);
    success(ctx, null, 'Password changed');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
