#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack.js';
import { DataStack } from '../lib/data-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { FrontendStack } from '../lib/frontend-stack.js';
import { CollectorStack } from '../lib/collector-stack.js';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1',
};

const authStack = new AuthStack(app, 'SanjiHiroba-Auth', { env });
const dataStack = new DataStack(app, 'SanjiHiroba-Data', { env });
const apiStack = new ApiStack(app, 'SanjiHiroba-Api', {
  env,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  table: dataStack.table,
});
const frontendStack = new FrontendStack(app, 'SanjiHiroba-Frontend', { env });
const collectorStack = new CollectorStack(app, 'SanjiHiroba-Collector', {
  env,
  table: dataStack.table,
});
