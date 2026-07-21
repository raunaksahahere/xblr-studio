import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getAiTrainingStatus, runAiModelTraining } from '../services/aiTrainingService';

export const handleGetAiTrainingStatus = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await getAiTrainingStatus();
    res.json(status);
  } catch (error) {
    console.error('[AiTraining] Status error:', error);
    res.status(500).json({ error: 'Failed to load AI training status.' });
  }
};

export const handleRunAiTraining = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await runAiModelTraining();
    res.json({
      message: 'AI model training completed successfully.',
      result,
    });
  } catch (error) {
    console.error('[AiTraining] Run error:', error);
    res.status(500).json({ error: 'AI model training failed.' });
  }
};
