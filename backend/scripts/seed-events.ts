import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { EVENTS } from '../../frontend/src/data/events.ts';
import { docClient, TABLE_EVENTS } from '../shared/dynamodb.js';

const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');
let inserted = 0;
let updated = 0;
let existing = 0;

if (!apply) {
  console.log(`Dry run: ${EVENTS.length} design events are ready for ${TABLE_EVENTS}.`);
  console.log('Run with --apply after backup.');
  console.log('Run with --apply --force to overwrite existing events (update dates etc).');
  process.exit(0);
}

for (const event of EVENTS) {
  const now = new Date().toISOString();
  if (force) {
    // 強制上書き: 日付等を最新に更新
    await docClient.send(new PutCommand({
      TableName: TABLE_EVENTS,
      Item: {
        ...event,
        pk: 'EVENTS',
        sk: `EVENT#${event.id}`,
        eventId: event.id,
        createdAt: now,
        updatedAt: now,
      },
    }));
    updated += 1;
  } else {
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_EVENTS,
        Item: {
          ...event,
          pk: 'EVENTS',
          sk: `EVENT#${event.id}`,
          eventId: event.id,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }));
      inserted += 1;
    } catch (cause) {
      if ((cause as { name?: string }).name !== 'ConditionalCheckFailedException') throw cause;
      existing += 1;
    }
  }
}

if (force) {
  console.log(`Seed complete (force mode): ${updated} events updated.`);
} else {
  console.log(`Seed complete: ${inserted} inserted, ${existing} already existed.`);
}
