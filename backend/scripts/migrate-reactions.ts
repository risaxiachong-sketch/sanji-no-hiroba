import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_REACTIONS } from '../shared/dynamodb.js';
import { VALID_EMOJIS } from '../shared/validation.js';

const apply = process.argv.includes('--apply');
if (!apply) {
  console.log('Dry run: legacy reactions in ' + TABLE_REACTIONS + ' will be copied to the multiple-reaction key format.');
  console.log('Run with --apply after backup and AWS credential confirmation.');
  process.exit(0);
}

let cursor: Record<string, unknown> | undefined;
let candidates = 0;
let migrated = 0;

do {
  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_REACTIONS,
    ExclusiveStartKey: cursor,
  }));

  for (const item of result.Items ?? []) {
    const key = String(item.sk ?? '');
    const emoji = String(item.emoji ?? '');
    const userId = String(item.userId ?? '');
    const isLegacy = key.startsWith('REACTION#') && key.split('#').length === 2;
    if (!isLegacy || item.legacyMigratedAt || !userId || !VALID_EMOJIS.includes(emoji as never)) continue;

    candidates += 1;
    const migratedAt = new Date().toISOString();
    await docClient.send(new PutCommand({
      TableName: TABLE_REACTIONS,
      Item: {
        ...item,
        sk: 'REACTION#' + userId + '#' + emoji,
        migratedFrom: key,
        migratedAt,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    })).catch((cause: unknown) => {
      if ((cause as { name?: string }).name !== 'ConditionalCheckFailedException') throw cause;
    });

    await docClient.send(new UpdateCommand({
      TableName: TABLE_REACTIONS,
      Key: { pk: item.pk, sk: item.sk },
      UpdateExpression: 'SET legacyMigratedAt = if_not_exists(legacyMigratedAt, :now)',
      ExpressionAttributeValues: { ':now': migratedAt },
    }));
    migrated += 1;
  }

  cursor = result.LastEvaluatedKey;
} while (cursor);

console.log('Migration complete: ' + migrated + ' of ' + candidates + ' legacy reactions marked and copied.');