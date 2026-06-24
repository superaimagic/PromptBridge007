import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import BasicLayout from '@/components/Layout/BasicLayout';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));

const PromptList = lazy(() => import('@/pages/Prompt/List'));
const PromptDetail = lazy(() => import('@/pages/Prompt/Detail'));
const PromptEdit = lazy(() => import('@/pages/Prompt/Edit'));

const WorkflowList = lazy(() => import('@/pages/Workflow/List'));
const WorkflowDetail = lazy(() => import('@/pages/Workflow/Detail'));
const WorkflowEditor = lazy(() => import('@/pages/Workflow/Editor'));

const ExecutionList = lazy(() => import('@/pages/Execution/List'));
const ExecutionDetail = lazy(() => import('@/pages/Execution/Detail'));

const Monitor = lazy(() => import('@/pages/Monitor'));

const ABTestList = lazy(() => import('@/pages/ABTest/List'));
const ABTestDetail = lazy(() => import('@/pages/ABTest/Detail'));

const RoleTemplateList = lazy(() => import('@/pages/RoleTemplate/List'));
const RoleTemplateDetail = lazy(() => import('@/pages/RoleTemplate/Detail'));

const Settings = lazy(() => import('@/pages/Settings'));

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <BasicLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'prompts',
        element: <PromptList />,
      },
      {
        path: 'prompts/create',
        element: <PromptEdit />,
      },
      {
        path: 'prompts/:id',
        element: <PromptDetail />,
      },
      {
        path: 'prompts/:id/edit',
        element: <PromptEdit />,
      },
      {
        path: 'workflows',
        element: <WorkflowList />,
      },
      {
        path: 'workflows/create',
        element: <WorkflowEditor />,
      },
      {
        path: 'workflows/:id',
        element: <WorkflowDetail />,
      },
      {
        path: 'workflows/:id/editor',
        element: <WorkflowEditor />,
      },
      {
        path: 'executions',
        element: <ExecutionList />,
      },
      {
        path: 'executions/:id',
        element: <ExecutionDetail />,
      },
      {
        path: 'monitor',
        element: <Monitor />,
      },
      {
        path: 'ab-tests',
        element: <ABTestList />,
      },
      {
        path: 'ab-tests/:id',
        element: <ABTestDetail />,
      },
      {
        path: 'role-templates',
        element: <RoleTemplateList />,
      },
      {
        path: 'role-templates/:id',
        element: <RoleTemplateDetail />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];
