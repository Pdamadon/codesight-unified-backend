#!/usr/bin/env npx tsx

import { prisma } from '../lib/database';
import { Logger } from '../utils/logger';

const SessionAnalyzer = require('../session-analyzer.js');
const JourneyReconstructor = require('../journey-reconstructor.js');
const WorldModelBuilder = require('../world-model-builder.js');
const Agent1DataGenerator = require('../agent1-data-generator.js');
const Agent2DataGenerator = require('../agent2-data-generator.js');

const logger = new Logger('ProcessSessions');

async function processRealSessions() {
  try {
    console.log('🚀 PROCESSING REAL SESSION DATA');
    console.log('================================\n');

    // Initialize pipeline components
    const sessionAnalyzer = new SessionAnalyzer();
    const journeyReconstructor = new JourneyReconstructor();
    const worldModelBuilder = new WorldModelBuilder();

    // Fetch recent completed sessions
    console.log('📊 Fetching recent sessions from database...');
    const sessions = await prisma.unifiedSession.findMany({
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 2
    });

    if (sessions.length === 0) {
      console.log('❌ No completed sessions found in database');
      return;
    }

    console.log(`✅ Found ${sessions.length} completed sessions\n`);

    // Phase 1: Session Analysis
    console.log('📊 PHASE 1: SESSION ANALYSIS');
    console.log('============================');
    
    const sessionAnalyses = [];
    for (const session of sessions) {
      try {
        console.log(`Analyzing session: ${session.id}`);
        
        // Parse enhanced interactions from JSON field  
        const enhancedInteractions = session.enhancedInteractions as any[];
        
        // Extract domain from page titles first
        const samplePageTitle = enhancedInteractions[0]?.context?.pageTitle || '';
        const domain = samplePageTitle.includes('Nordstrom') ? 'nordstrom.com' : 
                      samplePageTitle.includes('Adidas') ? 'adidas.com' :
                      'unknown.com';

        const interactions = enhancedInteractions.map((interaction: any) => ({
          timestamp: interaction.timestamp || Date.now(),
          url: `https://${domain}/${interaction.context?.pageStructure?.pageType || 'unknown'}`,
          type: interaction.type?.toLowerCase() || 'unknown',  
          element: interaction.element || {},
          context: {
            url: `https://${domain}/${interaction.context?.pageStructure?.pageType || 'unknown'}`,
            pageTitle: interaction.context?.pageTitle,
            domSnapshot: interaction.context?.pageStructure
          },
          data: {
            pageTitle: interaction.context?.pageTitle,
            pageStructure: interaction.context?.pageStructure,
            visual: interaction.visual,
            state: interaction.state,
            preClassifiedPageType: interaction.context?.pageStructure?.pageType
          }
        }));

        const sessionData = {
          sessionId: session.id,
          interactions,
          metadata: {
            duration: session.duration || 0,
            totalInteractions: interactions.length,
            domain: domain,
            userAgent: session.userAgent || 'unknown'
          }
        };

        console.log(`  📊 Sample page: "${samplePageTitle.substring(0, 50)}..." on ${domain}`);
        console.log(`  🔍 Sample pre-classified type: ${enhancedInteractions[0]?.context?.pageStructure?.pageType}`);

        const analysis = await sessionAnalyzer.analyzeSession(sessionData);
        sessionAnalyses.push({
          sessionId: session.id,
          analysis,
          sessionData
        });

        const pageCount = analysis.pageTypes?.size || analysis.pageTypes?.length || 0;
        console.log(`  ✅ Pages: ${pageCount}, Quality: ${((analysis.qualityMetrics?.overallQuality || 0) * 100).toFixed(1)}%`);
      } catch (error) {
        console.log(`  ❌ Error analyzing session ${session.id}: ${(error as Error).message}`);
      }
    }

    if (sessionAnalyses.length === 0) {
      console.log('❌ No sessions could be analyzed');
      return;
    }

    // Phase 2: Journey Reconstruction
    console.log('\n🗺️ PHASE 2: JOURNEY RECONSTRUCTION');
    console.log('===================================');
    
    const journeyData = [];
    for (const { sessionId, analysis, sessionData } of sessionAnalyses) {
      try {
        console.log(`Reconstructing journeys for: ${sessionId}`);
        const journeyResult = await journeyReconstructor.reconstructJourneys(sessionData, analysis);
        const journeys = journeyResult.journeys || [];
        journeyData.push({
          sessionId,
          journeys,
          sessionData,
          analysis
        });
        console.log(`  ✅ Journeys: ${journeys.length}, Quality: ${(journeys[0]?.qualityScore || 0 * 100).toFixed(1)}%`);
      } catch (error) {
        console.log(`  ❌ Error reconstructing journeys for ${sessionId}: ${(error as Error).message}`);
      }
    }

    // Phase 3: World Model Construction
    console.log('\n🏗️ PHASE 3: WORLD MODEL CONSTRUCTION');
    console.log('====================================');
    
    const primaryDomain = 'unknown.com'; // Extract from session URLs or set default
    console.log(`Building world model for: ${primaryDomain}`);
    
    const worldModel = await worldModelBuilder.buildWorldModel(
      sessionAnalyses.map(s => s.analysis),
      journeyData,
      primaryDomain
    );

    console.log(`✅ World model quality: ${(worldModel.modelQuality.modelConfidence * 100).toFixed(1)}%`);

    // Initialize training data generators with world model
    const agent1Generator = new Agent1DataGenerator(worldModel);
    const agent2Generator = new Agent2DataGenerator(worldModel);

    // Phase 4: Training Data Generation
    console.log('\n🧠 PHASE 4A: AGENT 1 TRAINING DATA');  
    console.log('==================================');
    
    console.log('Debug: sessionAnalyses structure:', sessionAnalyses.length);
    console.log('Debug: first analysis keys:', Object.keys(sessionAnalyses[0]?.analysis || {}));
    console.log('Debug: first pageTypes:', sessionAnalyses[0]?.analysis?.pageTypes?.size || 0);
    console.log('Debug: journeyData structure:', journeyData.length);
    
    // Create adapter for Agent1DataGenerator expected format
    const adaptedJourneyData = journeyData.map(data => ({
      ...data,
      journeys: data.journeys.length > 0 ? data.journeys : [
        // Create synthetic journey from pageTypes if no real journeys
        {
          userIntent: 'browse products',
          journeyType: 'product-research',
          stepCount: data.analysis.pageTypes?.size || 0,
          navigationFlow: Array.from(data.analysis.pageTypes?.values() || []).map((page: any) => ({
            pageType: page.pageType,
            timestamp: page.timestamp,
            url: page.url
          })),
          pageTypeSequence: Array.from(data.analysis.pageTypes?.values() || []).map((p: any) => p.pageType),
          conversionPoints: []
        }
      ]
    }));

    const agent1Data = await agent1Generator.generateSiteComprehensionData(
      sessionAnalyses.map(s => s.analysis),
      adaptedJourneyData
    );

    let totalAgent1Examples = 0;
    for (const [datasetName, dataset] of Object.entries(agent1Data)) {
      const typedDataset = dataset as any;
      console.log(`   📊 ${datasetName}: ${typedDataset.examples.length} examples (${(typedDataset.qualityScore * 100).toFixed(1)}%)`);
      totalAgent1Examples += typedDataset.examples.length;
    }

    console.log('\n🎯 PHASE 4B: AGENT 2 TRAINING DATA');
    console.log('==================================');
    
    const agent2Data = await agent2Generator.generateClickExecutionData(
      sessionAnalyses.map(s => s.analysis),
      journeyData
    );

    let totalAgent2Examples = 0;
    for (const [datasetName, dataset] of Object.entries(agent2Data)) {
      const typedDataset = dataset as any;
      console.log(`   🎯 ${datasetName}: ${typedDataset.examples.length} examples (${(typedDataset.qualityScore * 100).toFixed(1)}%)`);
      totalAgent2Examples += typedDataset.examples.length;
    }

    // Phase 5: Export Training Data
    console.log('\n💾 PHASE 5: EXPORT TRAINING DATA');
    console.log('=================================');
    
    const fs = require('fs');
    
    // Export Agent 1 training data
    const agent1TrainingData: any[] = [];
    for (const [datasetName, dataset] of Object.entries(agent1Data)) {
      const typedDataset = dataset as any;
      agent1TrainingData.push(...typedDataset.examples);
    }
    
    const agent1Filename = `./agent1-real-data-${Date.now()}.jsonl`;
    fs.writeFileSync(agent1Filename, agent1TrainingData.map(ex => JSON.stringify(ex)).join('\n'));
    console.log(`✅ Agent 1 training data: ${agent1Filename} (${agent1TrainingData.length} examples)`);

    // Export Agent 2 training data
    const agent2TrainingData: any[] = [];
    for (const [datasetName, dataset] of Object.entries(agent2Data)) {
      const typedDataset = dataset as any;
      agent2TrainingData.push(...typedDataset.examples);
    }
    
    const agent2Filename = `./agent2-real-data-${Date.now()}.jsonl`;
    fs.writeFileSync(agent2Filename, agent2TrainingData.map(ex => JSON.stringify(ex)).join('\n'));
    console.log(`✅ Agent 2 training data: ${agent2Filename} (${agent2TrainingData.length} examples)`);

    // Export world model
    const worldModelFilename = `./world-model-real-${Date.now()}.json`;
    fs.writeFileSync(worldModelFilename, JSON.stringify(worldModel, null, 2));
    console.log(`✅ World model: ${worldModelFilename}`);

    // Final Summary
    console.log('\n📈 REAL DATA PIPELINE RESULTS');
    console.log('=============================');
    console.log(`Sessions Processed: ${sessionAnalyses.length}`);
    console.log(`Journeys Reconstructed: ${journeyData.length}`);
    console.log(`Agent 1 Training Examples: ${totalAgent1Examples}`);
    console.log(`Agent 2 Training Examples: ${totalAgent2Examples}`);
    console.log(`World Model Domain: ${primaryDomain}`);
    console.log('\n✅ REAL DATA PROCESSING COMPLETE!');

  } catch (error) {
    logger.error('Error processing real sessions:', error);
    console.error('❌ Pipeline failed:', (error as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  processRealSessions().catch(console.error);
}

export { processRealSessions };