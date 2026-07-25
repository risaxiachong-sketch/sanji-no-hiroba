import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface CollectorStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
}

export class CollectorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CollectorStackProps) {
    super(scope, id, props);
    // TODO: Implement in TASK-06
  }
}
