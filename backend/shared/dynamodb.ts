import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });

export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_POSTS = process.env.TABLE_POSTS ?? 'sanji-demo-posts';
export const TABLE_REACTIONS = process.env.TABLE_REACTIONS ?? 'sanji-demo-reactions';
export const TABLE_EVENTS = process.env.TABLE_EVENTS ?? 'sanji-demo-events';
