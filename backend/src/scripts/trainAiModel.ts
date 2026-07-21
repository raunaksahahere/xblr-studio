import 'dotenv/config';
import prisma from '../config/db';
import { runAiModelTraining, getAiTrainingStatus } from '../services/aiTrainingService';

async function main() {
  console.log('=================================================');
  console.log('  AI XBRL Studio — Model Training Run           ');
  console.log('=================================================\n');

  const before = await getAiTrainingStatus();
  console.log('Previous training:', before.lastTrainedAt ?? 'never');

  const result = await runAiModelTraining();

  console.log('\nTraining summary:');
  console.log(`  Drop folders: ${result.dropFoldersScanned.join(', ')}`);
  console.log(`  Files processed: ${result.filesProcessed} (skipped: ${result.filesSkipped})`);
  console.log(`  Scenarios registered: ${result.scenarioCount}`);
  console.log(`  Homonymous examples: ${result.homonymousExampleCount}`);
  console.log(`  Ontology terms: ${result.ontologyTermCount}`);
  console.log(`  XBRL mappings learned: ${result.xbrlMappingsLearned}`);
  console.log(`  Knowledge graph exemplars: ${result.knowledgeGraphNodesCreated}`);
  console.log(`  Gemini enabled: ${result.geminiTrainingEnabled}`);
  console.log(`  Gemini model: ${result.geminiModel ?? 'n/a'}`);
  console.log(`  Gemini playbook: ${result.geminiPlaybookGenerated ? 'yes' : 'no'}`);
  if (result.geminiFinetuneJsonlPath) {
    console.log(`  Vertex/Gemini SFT export: ${result.geminiFinetuneJsonlPath}`);
  }
  console.log('\n=================================================');
  console.log('  TRAINING COMPLETE                              ');
  console.log('=================================================');
}

main()
  .catch((err) => {
    console.error('Training failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
