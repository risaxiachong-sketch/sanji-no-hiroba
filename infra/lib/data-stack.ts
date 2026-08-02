import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class DataStack extends cdk.Stack {
  public readonly postsTable: dynamodb.ITable;
  public readonly reactionsTable: dynamodb.ITable;
  public readonly eventsTable: dynamodb.ITable;
  public readonly usersTable: dynamodb.ITable;
  public readonly savedEventsTable: dynamodb.ITable;
  public readonly imagesBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const postsTableName = this.node.tryGetContext('postsTableName') ?? 'sanji-demo-posts';
    const reactionsTableName = this.node.tryGetContext('reactionsTableName') ?? 'sanji-demo-reactions';
    const eventsTableName = this.node.tryGetContext('eventsTableName') ?? 'sanji-demo-events';
    const usersTableName = this.node.tryGetContext('usersTableName') ?? 'sanji-demo-users';
    const savedEventsTableName = this.node.tryGetContext('savedEventsTableName') ?? 'sanji-demo-saved-events';
    const imagesBucketName = this.node.tryGetContext('imagesBucketName') ?? 'sanji-demo-images';

    // Existing production data stays outside this stack and is only referenced.
    this.postsTable = dynamodb.Table.fromTableName(this, 'ExistingPostsTable', postsTableName);
    this.reactionsTable = dynamodb.Table.fromTableName(this, 'ExistingReactionsTable', reactionsTableName);
    this.eventsTable = dynamodb.Table.fromTableName(this, 'ExistingEventsTable', eventsTableName);
    this.imagesBucket = s3.Bucket.fromBucketName(this, 'ExistingImagesBucket', imagesBucketName);

    // Only the two new data stores are created by this stack.
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: usersTableName,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.savedEventsTable = new dynamodb.Table(this, 'SavedEventsTable', {
      tableName: savedEventsTableName,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cdk.CfnOutput(this, 'UsersTableName', { value: this.usersTable.tableName });
    new cdk.CfnOutput(this, 'SavedEventsTableName', { value: this.savedEventsTable.tableName });
  }
}