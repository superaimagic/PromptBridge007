import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import * as executionModel from '../models/execution';
import { ContextManager } from './ContextManager';
import { PromptNodeHandler } from './handlers/PromptNodeHandler';
import { AINodeHandler } from './handlers/AINodeHandler';
import { ConditionHandler } from './handlers/ConditionHandler';
import { DataTransformHandler } from './handlers/DataTransformHandler';
import { HumanReviewHandler } from './handlers/HumanReviewHandler';
import { HttpRequestHandler } from './handlers/HttpRequestHandler';
import { LoopHandler } from './handlers/LoopHandler';
import { CodeHandler } from './handlers/CodeHandler';
import { v4 as uuidv4 } from 'uuid';

interface NodeHandler {
  execute(input: any, context: ContextManager): Promise<any>;
}

export class WorkflowEngine {
  private handlers: Record<string, NodeHandler>;

  constructor() {
    this.handlers = {
      prompt: new PromptNodeHandler(),
      ai: new AINodeHandler(),
      condition: new ConditionHandler(),
      data_transform: new DataTransformHandler(),
      human_review: new HumanReviewHandler(),
      http_request: new HttpRequestHandler(),
      loop: new LoopHandler(),
      code: new CodeHandler(),
    };
  }

  async execute(workflowId: string, executionId: string, input: any, triggeredBy: string): Promise<any> {
    // Load workflow definition
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM workflows WHERE id = ?',
      [workflowId]
    );
    if (rows.length === 0) {
      throw new Error('Workflow not found');
    }

    const workflow = rows[0];
    let definition = workflow.config;
    if (typeof definition === 'string') {
      try { definition = JSON.parse(definition); } catch { definition = { nodes: [], edges: [] }; }
    }
    if (!definition || !definition.nodes) {
      definition = { nodes: [], edges: [] };
    }

    const nodes: any[] = definition.nodes || [];
    const edges: any[] = definition.edges || [];

    if (nodes.length === 0) {
      throw new Error('Workflow has no nodes');
    }

    // Update execution status to running
    await executionModel.updateStatus(executionId, 'running');

    // Create context manager
    const context = new ContextManager(input);

    // Build adjacency map
    const adjacency: Record<string, string[]> = {};
    for (const edge of edges) {
      if (!adjacency[edge.source]) adjacency[edge.source] = [];
      adjacency[edge.source].push(edge.target);
    }

    // Find start node
    const startNode = nodes.find((n: any) => n.type === 'start') || nodes[0];
    const nodeMap: Record<string, any> = {};
    for (const node of nodes) {
      nodeMap[node.id] = node;
    }

    // Execute nodes
    let currentNodeId: string | null = startNode.id;
    let finalOutput: any = null;

    while (currentNodeId) {
      const node = nodeMap[currentNodeId];
      if (!node) break;

      // Skip start and end nodes
      if (node.type === 'start') {
        context.setNodeResult(node.id, { type: 'start', output: input });
        const nextNodes = adjacency[node.id] || [];
        currentNodeId = nextNodes.length > 0 ? nextNodes[0] : null;
        continue;
      }

      if (node.type === 'end') {
        finalOutput = context.get('lastOutput') || input;
        context.setNodeResult(node.id, { type: 'end', output: finalOutput });
        break;
      }

      // Create node execution record
      const nodeExecutionId = uuidv4();
      const nodeInput = { ...node.data, previousOutput: context.get('lastOutput') };

      await executionModel.createNodeExecution({
        id: nodeExecutionId,
        execution_id: executionId,
        node_id: node.id,
        node_type: node.type,
        input: nodeInput,
      });

      try {
        const handler = this.handlers[node.type];
        let result: any;

        if (handler) {
          result = await handler.execute(nodeInput, context);
        } else {
          result = { output: nodeInput, message: `Unknown node type: ${node.type}` };
        }

        // Store result in context
        context.setNodeResult(node.id, result);
        context.set('lastOutput', result);
        context.set(node.id, result);

        // Update node execution
        await executionModel.updateNodeExecution(nodeExecutionId, {
          status: 'completed',
          output: result,
        });

        // Handle condition nodes
        if (node.type === 'condition' && result) {
          const conditionResult = result.conditionResult;
          const nextNodeId = conditionResult ? result.trueBranch : result.falseBranch;
          if (nextNodeId) {
            currentNodeId = nextNodeId;
            continue;
          }
        }

        // Move to next node
        const nextNodes = adjacency[node.id] || [];
        currentNodeId = nextNodes.length > 0 ? nextNodes[0] : null;

      } catch (err: any) {
        await executionModel.updateNodeExecution(nodeExecutionId, {
          status: 'failed',
          error_message: err.message,
        });

        await executionModel.updateStatus(executionId, 'failed', {
          error_message: `Node ${node.id} failed: ${err.message}`,
        });

        throw err;
      }
    }

    if (!finalOutput) {
      finalOutput = context.get('lastOutput');
    }

    await executionModel.updateStatus(executionId, 'completed', {
      output: finalOutput,
    });

    return finalOutput;
  }
}
