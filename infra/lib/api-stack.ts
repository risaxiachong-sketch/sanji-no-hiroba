import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  table: dynamodb.ITable;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // ─── REST API ───────────────────────────────────────────────
    this.api = new apigateway.RestApi(this, 'SanjiHirobaApi', {
      restApiName: 'sanji-no-hiroba-api',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 500,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // ─── Cognito Authorizer ─────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool as cognito.UserPool],
      identitySource: 'method.request.header.Authorization',
    });

    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // ─── Common Lambda config ───────────────────────────────────
    const lambdaEnv = {
      TABLE_NAME: props.table.tableName,
      REGION: cdk.Stack.of(this).region,
    };

    const createFunction = (name: string, extraEnv?: Record<string, string>): lambda.Function => {
      return new lambda.Function(this, name, {
        functionName: `sanji-${name}`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(
          'exports.handler = async (event) => ({ statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "TODO" }) });'
        ),
        environment: { ...lambdaEnv, ...extraEnv },
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
      });
    };

    // ─── Lambda functions ───────────────────────────────────────
    const apiUser = createFunction('api-user');
    const apiPost = createFunction('api-post');
    const apiReaction = createFunction('api-reaction');
    const apiEvent = createFunction('api-event');
    const apiSaved = createFunction('api-saved');
    const apiAiSearch = createFunction('api-ai-search', {
      BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
    });
    const apiPlaza = createFunction('api-plaza');
    const apiAdmin = createFunction('api-admin');

    // ─── DynamoDB permissions ───────────────────────────────────
    const allFunctions = [apiUser, apiPost, apiReaction, apiEvent, apiSaved, apiAiSearch, apiPlaza, apiAdmin];
    allFunctions.forEach((fn) => props.table.grantReadWriteData(fn));

    // ─── Bedrock permission for ai-search ───────────────────────
    apiAiSearch.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      })
    );

    // ─── API Routes ─────────────────────────────────────────────

    // /users
    const users = this.api.root.addResource('users');
    const usersProfile = users.addResource('profile');
    usersProfile.addMethod('POST', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);
    usersProfile.addMethod('GET', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);
    usersProfile.addMethod('PUT', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);

    const usersAvatar = users.addResource('avatar');
    usersAvatar.addMethod('POST', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);
    usersAvatar.addMethod('GET', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);
    usersAvatar.addMethod('PUT', new apigateway.LambdaIntegration(apiUser), defaultMethodOptions);

    // /posts
    const posts = this.api.root.addResource('posts');
    posts.addMethod('POST', new apigateway.LambdaIntegration(apiPost), defaultMethodOptions);
    posts.addMethod('GET', new apigateway.LambdaIntegration(apiPost), defaultMethodOptions);

    const postId = posts.addResource('{postId}');
    postId.addMethod('DELETE', new apigateway.LambdaIntegration(apiPost), defaultMethodOptions);

    // /posts/{postId}/reactions
    const reactions = postId.addResource('reactions');
    reactions.addMethod('POST', new apigateway.LambdaIntegration(apiReaction), defaultMethodOptions);

    const reactionType = reactions.addResource('{type}');
    reactionType.addMethod('DELETE', new apigateway.LambdaIntegration(apiReaction), defaultMethodOptions);

    const reactionsCounts = reactions.addResource('counts');
    reactionsCounts.addMethod('GET', new apigateway.LambdaIntegration(apiReaction), defaultMethodOptions);

    const reactionsMine = reactions.addResource('mine');
    reactionsMine.addMethod('GET', new apigateway.LambdaIntegration(apiReaction), defaultMethodOptions);

    // /events
    const events = this.api.root.addResource('events');
    events.addMethod('GET', new apigateway.LambdaIntegration(apiEvent), defaultMethodOptions);

    const eventId = events.addResource('{eventId}');
    eventId.addMethod('GET', new apigateway.LambdaIntegration(apiEvent), defaultMethodOptions);

    // /saved-events
    const savedEvents = this.api.root.addResource('saved-events');
    savedEvents.addMethod('GET', new apigateway.LambdaIntegration(apiSaved), defaultMethodOptions);

    const savedEventId = savedEvents.addResource('{eventId}');
    savedEventId.addMethod('POST', new apigateway.LambdaIntegration(apiSaved), defaultMethodOptions);
    savedEventId.addMethod('DELETE', new apigateway.LambdaIntegration(apiSaved), defaultMethodOptions);

    // /ai-search
    const aiSearch = this.api.root.addResource('ai-search');
    const aiSearchManual = aiSearch.addResource('manual');
    aiSearchManual.addMethod('POST', new apigateway.LambdaIntegration(apiAiSearch), defaultMethodOptions);

    const aiSearchNatural = aiSearch.addResource('natural');
    aiSearchNatural.addMethod('POST', new apigateway.LambdaIntegration(apiAiSearch), defaultMethodOptions);

    // /plaza
    const plaza = this.api.root.addResource('plaza');
    const plazaVisit = plaza.addResource('visit');
    plazaVisit.addMethod('POST', new apigateway.LambdaIntegration(apiPlaza), defaultMethodOptions);

    const plazaTodayCount = plaza.addResource('today-count');
    plazaTodayCount.addMethod('GET', new apigateway.LambdaIntegration(apiPlaza), defaultMethodOptions);

    const plazaAvatars = plaza.addResource('avatars');
    plazaAvatars.addMethod('GET', new apigateway.LambdaIntegration(apiPlaza), defaultMethodOptions);

    // /admin
    const admin = this.api.root.addResource('admin');

    const adminReports = admin.addResource('reports');
    adminReports.addMethod('GET', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    const adminPosts = admin.addResource('posts');
    const adminPostId = adminPosts.addResource('{postId}');
    const adminPostHide = adminPostId.addResource('hide');
    adminPostHide.addMethod('POST', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    const adminEvents = admin.addResource('events');
    const adminEventsReview = adminEvents.addResource('review');
    adminEventsReview.addMethod('GET', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    const adminEventId = adminEvents.addResource('{eventId}');
    const adminEventPublish = adminEventId.addResource('publish');
    adminEventPublish.addMethod('POST', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    const adminEventHide = adminEventId.addResource('hide');
    adminEventHide.addMethod('POST', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    const adminCollectLogs = admin.addResource('collect-logs');
    adminCollectLogs.addMethod('GET', new apigateway.LambdaIntegration(apiAdmin), defaultMethodOptions);

    // ─── Stack output ───────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: 'SanjiHiroba-ApiUrl',
    });
  }
}
