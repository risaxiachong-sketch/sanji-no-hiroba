import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  postsTable: dynamodb.ITable;
  reactionsTable: dynamodb.ITable;
  eventsTable: dynamodb.ITable;
  usersTable: dynamodb.ITable;
  savedEventsTable: dynamodb.ITable;
  imagesBucket: s3.IBucket;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const adminApiKey = new cdk.CfnParameter(this, 'AdminApiKey', {
      type: 'String',
      noEcho: true,
      minLength: 16,
      description: 'Facility API key. Supply at deploy time and do not commit it.',
    });

    this.api = new apigateway.RestApi(this, 'SanjiHirobaApiV2', {
      restApiName: 'sanji-no-hiroba-api-v2',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-api-key'],
      },
    });

    const environment = {
      TABLE_POSTS: props.postsTable.tableName,
      TABLE_REACTIONS: props.reactionsTable.tableName,
      TABLE_EVENTS: props.eventsTable.tableName,
      TABLE_USERS: props.usersTable.tableName,
      TABLE_SAVED_EVENTS: props.savedEventsTable.tableName,
      S3_BUCKET: props.imagesBucket.bucketName,
      ADMIN_API_KEY: adminApiKey.valueAsString,
    };

    const createFunction = (id: string, assetName: string) => new lambda.Function(this, id, {
      functionName: `sanji-v2-${assetName}`,
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.resolve(process.cwd(), '../backend/dist', assetName)),
      environment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const usersFunction = createFunction('UsersFunction', 'users-handler');
    const postsFunction = createFunction('PostsFunction', 'posts-handler');
    const reactionsFunction = createFunction('ReactionsFunction', 'reactions-handler');
    const eventsFunction = createFunction('EventsFunction', 'events-handler');
    const savedEventsFunction = createFunction('SavedEventsFunction', 'saved-events-handler');
    const plazaFunction = createFunction('PlazaFunction', 'plaza-handler');
    const uploadFunction = createFunction('UploadFunction', 'upload-url-handler');

    props.usersTable.grantReadWriteData(usersFunction);

    props.postsTable.grantReadWriteData(postsFunction);
    props.reactionsTable.grantReadData(postsFunction);
    props.usersTable.grantReadData(postsFunction);

    props.reactionsTable.grantReadWriteData(reactionsFunction);
    props.usersTable.grantReadData(reactionsFunction);

    props.eventsTable.grantReadWriteData(eventsFunction);
    props.imagesBucket.grantRead(eventsFunction);

    props.savedEventsTable.grantReadWriteData(savedEventsFunction);
    props.usersTable.grantReadData(savedEventsFunction);

    props.postsTable.grantReadData(plazaFunction);
    props.usersTable.grantReadData(plazaFunction);

    props.imagesBucket.grantPut(uploadFunction);

    const integrate = (fn: lambda.IFunction) => new apigateway.LambdaIntegration(fn);

    const users = this.api.root.addResource('users');
    users.addResource('register').addMethod('POST', integrate(usersFunction));
    const me = users.addResource('me');
    me.addMethod('GET', integrate(usersFunction));
    me.addMethod('PATCH', integrate(usersFunction));

    const posts = this.api.root.addResource('posts');
    posts.addMethod('GET', integrate(postsFunction));
    posts.addMethod('POST', integrate(postsFunction));
    const post = posts.addResource('{postId}');
    const postReactions = post.addResource('reactions');
    postReactions.addMethod('GET', integrate(reactionsFunction));
    const postReactionType = postReactions.addResource('{type}');
    postReactionType.addMethod('POST', integrate(reactionsFunction));
    postReactionType.addMethod('DELETE', integrate(reactionsFunction));

    // Keep the old reaction route available during the frontend migration.
    const legacyReactions = this.api.root.addResource('reactions');
    legacyReactions.addMethod('GET', integrate(reactionsFunction));
    legacyReactions.addMethod('POST', integrate(reactionsFunction));
    legacyReactions.addMethod('DELETE', integrate(reactionsFunction));

    const events = this.api.root.addResource('events');
    events.addMethod('GET', integrate(eventsFunction));
    const event = events.addResource('{eventId}');
    event.addMethod('GET', integrate(eventsFunction));

    const savedEvents = this.api.root.addResource('saved-events');
    savedEvents.addMethod('GET', integrate(savedEventsFunction));
    const savedEvent = savedEvents.addResource('{eventId}');
    savedEvent.addMethod('POST', integrate(savedEventsFunction));
    savedEvent.addMethod('DELETE', integrate(savedEventsFunction));

    const plaza = this.api.root.addResource('plaza');
    plaza.addResource('recent-users').addMethod('GET', integrate(plazaFunction));

    const admin = this.api.root.addResource('admin');
    const adminEvents = admin.addResource('events');
    adminEvents.addMethod('POST', integrate(eventsFunction));
    adminEvents.addResource('upload-url').addMethod('POST', integrate(uploadFunction));
    const adminEvent = adminEvents.addResource('{eventId}');
    adminEvent.addResource('status').addMethod('PATCH', integrate(eventsFunction));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'Set this value as VITE_API_BASE_URL in Amplify.',
    });
  }
}