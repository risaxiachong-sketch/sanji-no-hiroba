#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack.js';
import { DataStack } from '../lib/data-stack.js';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
};

const dataStack = new DataStack(app, 'SanjiHiroba-DataV2', { env });
const apiStack = new ApiStack(app, 'SanjiHiroba-ApiV2', {
  env,
  postsTable: dataStack.postsTable,
  reactionsTable: dataStack.reactionsTable,
  eventsTable: dataStack.eventsTable,
  usersTable: dataStack.usersTable,
  savedEventsTable: dataStack.savedEventsTable,
  imagesBucket: dataStack.imagesBucket,
});

apiStack.addStackDependency(dataStack);